import { PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Product } from "@/types";
import { BaseTable } from "./base";

/** A product a review decision rewrote, and the tags it gained by it. */
export interface TagChange {
  account_id: string;
  product_id: string;
  added: string[];
}

/**
 * A tag a product may carry. The id is the tag itself, the same string stored
 * in `product.metadata.tags`. A tag someone suggested is `pending` until an
 * admin decides: approved, it joins the list everyone picks from; merged or
 * rejected, it leaves products and the list but stays on record, with what
 * the decision changed, so the decision can be undone.
 */
export interface Tag {
  tag_id: string;
  pending?: boolean;
  /** Who suggested it and when. Tags from the initial import have neither. */
  suggested_by?: string;
  suggested_at?: string;
  /** An admin's decision on a suggestion, who made it and when. */
  outcome?: "approved" | "merged" | "rejected";
  reviewed_by?: string;
  reviewed_at?: string;
  /** The approved tags a merged suggestion was replaced with. */
  merged_into?: string[];
  /** What a merge or rejection did to products, for undoing it. */
  changed?: TagChange[];
}

/** On the list everyone picks from: approved, or from the initial import. */
export const isListed = (tag: Tag) =>
  !tag.pending && tag.outcome !== "merged" && tag.outcome !== "rejected";

/** A tag a product may carry: listed, or still awaiting review. */
export const isUsable = (tag: Tag) => isListed(tag) || !!tag.pending;

/**
 * The product form's tag props: approved tags to pick, and which of the
 * product's own tags are pending. Other products' pending tags aren't
 * public, so they stay on the server.
 */
export function tagProps(tags: Tag[], current: string[] = []) {
  return {
    tagOptions: tags.filter(isListed).map((t) => t.tag_id),
    pendingTags: tags
      .filter((t) => t.pending && current.includes(t.tag_id))
      .map((t) => t.tag_id),
  };
}

/**
 * The products with tags still pending review taken out, for showing them to
 * anyone outside the product's settings. A product `keep` returns true for
 * keeps its pending tags, so someone who edits its tags sees them all.
 */
export async function hidePendingTags<T extends Product>(
  products: T[],
  keep: (product: T) => boolean = () => false
): Promise<T[]> {
  let tags: Tag[];
  try {
    tags = await tagsTable.listAll();
  } catch {
    // Public pages, the prerendered homepage among them, mustn't fail on
    // this table: it may not be deployed yet, and then nothing is pending.
    // listAll has logged the error.
    return products;
  }
  const pending = new Set(tags.filter((t) => t.pending).map((t) => t.tag_id));
  if (!pending.size) return products;
  return products.map((product) => {
    const tags = product.metadata?.tags;
    if (!tags?.some((t) => pending.has(t)) || keep(product)) return product;
    return {
      ...product,
      metadata: { ...product.metadata, tags: tags.filter((t) => !pending.has(t)) },
    };
  });
}

/**
 * Whether any tag awaits an admin's review. False when the table can't be
 * read, because the nav calls this on every page and a missing dot is better
 * than a broken page. listAll has logged the error.
 */
export function anyPendingTags(): Promise<boolean> {
  return tagsTable.listAll().then(
    (tags) => tags.some((t) => t.pending),
    () => false
  );
}

const isConditionFailed = (error: unknown) =>
  (error as Error).name === "ConditionalCheckFailedException";

export class TagsTable extends BaseTable {
  model = "tags";

  /** Every tag, whatever its state, sorted by id. */
  async listAll(): Promise<Tag[]> {
    const tags: Tag[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    try {
      do {
        const result = await this.cachedSend(
          new ScanCommand({ TableName: this.table, ExclusiveStartKey })
        );
        tags.push(...((result.Items ?? []) as Tag[]));
        ExclusiveStartKey = result.LastEvaluatedKey;
      } while (ExclusiveStartKey);
    } catch (error) {
      this.logError("listAll", error);
      throw error;
    }
    return tags.sort((a, b) => a.tag_id.localeCompare(b.tag_id));
  }

  /**
   * Adds a pending tag. One merged or rejected before is suggested afresh,
   * replacing its record; any other tag that already exists is left as it is.
   */
  async suggest(tag_id: string, suggested_by: string): Promise<Tag> {
    const tag: Tag = {
      tag_id,
      pending: true,
      suggested_by,
      suggested_at: new Date().toISOString(),
    };
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.table,
          Item: tag,
          ConditionExpression:
            "attribute_not_exists(tag_id) OR outcome = :merged OR outcome = :rejected",
          ExpressionAttributeValues: { ":merged": "merged", ":rejected": "rejected" },
        })
      );
      return tag;
    } catch (error) {
      // Someone else's suggestion landed first; the tag exists either way.
      if (isConditionFailed(error)) return { tag_id };
      this.logError("suggest", error, { tag_id });
      throw error;
    }
  }

  /**
   * Records an admin's decision on a pending tag. Answers false, writing
   * nothing, when the tag isn't pending: another admin decided first.
   */
  async decide(
    tag_id: string,
    decision: Required<Pick<Tag, "outcome" | "reviewed_by">> &
      Pick<Tag, "merged_into" | "changed">
  ): Promise<boolean> {
    const fields = { ...decision, reviewed_at: new Date().toISOString() };
    const names = Object.keys(fields);
    try {
      await this.client.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { tag_id },
          UpdateExpression: `REMOVE pending SET ${names.map((n) => `${n} = :${n}`).join(", ")}`,
          ConditionExpression: "pending = :true",
          ExpressionAttributeValues: {
            ":true": true,
            ...Object.fromEntries(names.map((n) => [`:${n}`, fields[n as keyof typeof fields]])),
          },
        })
      );
      return true;
    } catch (error) {
      if (isConditionFailed(error)) return false;
      this.logError("decide", error, { tag_id });
      throw error;
    }
  }

  /**
   * Puts a decided tag back in the queue, forgetting the decision. Answers
   * false, writing nothing, when the tag has no decision to undo.
   */
  async reopen(tag_id: string): Promise<boolean> {
    try {
      await this.client.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { tag_id },
          UpdateExpression:
            "SET pending = :true REMOVE outcome, reviewed_by, reviewed_at, merged_into, changed",
          ConditionExpression: "attribute_exists(outcome)",
          ExpressionAttributeValues: { ":true": true },
        })
      );
      return true;
    } catch (error) {
      if (isConditionFailed(error)) return false;
      this.logError("reopen", error, { tag_id });
      throw error;
    }
  }
}

export const tagsTable = new TagsTable({});
