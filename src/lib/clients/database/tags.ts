import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { Product } from "@/types";
import type { TagCategory } from "@/lib/tags/categories";
import { BaseTable, type TransactItem } from "./base";

/** A product a review decision rewrote, and the tags it gained by it. */
export interface TagChange {
  account_id: string;
  product_id: string;
  added: string[];
}

/**
 * A tag a product may carry. The id is the tag itself, the same string stored
 * in `product.metadata.tags`. A listed tag has a category. A tag someone
 * suggested is `pending`, with no category, until an admin decides: approved,
 * it joins the list everyone picks from in the category they chose; merged or
 * rejected, it leaves products and the list but stays on record, with what
 * the decision changed, so the decision can be undone.
 */
export interface Tag {
  tag_id: string;
  /** The group the picker lists it under. */
  category?: TagCategory;
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
  /**
   * The review an approved or seeded tag had before an admin merged or
   * removed it, which undoing restores; empty for a seeded tag. A decision
   * on a suggestion has none, and undoing it puts the tag back awaiting review.
   */
  previous?: Pick<Tag, "outcome" | "reviewed_by" | "reviewed_at">;
}

/** The review fields a decision overwrites and undoing restores or clears. */
const REVIEW_FIELDS = [
  "outcome",
  "reviewed_by",
  "reviewed_at",
  "merged_into",
  "changed",
  "previous",
] as const;

/** An UpdateExpression's SET clause and values, for these fields. */
const setting = (fields: Record<string, unknown>) => {
  const names = Object.keys(fields);
  return {
    set: names.map((n) => `${n} = :${n}`).join(", "),
    values: Object.fromEntries(names.map((n) => [`:${n}`, fields[n]])),
  };
};

/** On the list everyone picks from: approved, or from the initial import. */
export const isListed = (tag: Tag) =>
  !tag.pending && tag.outcome !== "merged" && tag.outcome !== "rejected";

/** A tag a product may carry: listed, or still awaiting review. */
export const isUsable = (tag: Tag) => isListed(tag) || !!tag.pending;

/**
 * The product form's tag props: approved tags to pick, the category of each,
 * and which of the product's own tags are pending. Other products' pending
 * tags aren't public, so they stay on the server.
 */
export function tagProps(tags: Tag[], current: string[] = []) {
  const listed = tags.filter(isListed);
  return {
    tagOptions: listed.map((t) => t.tag_id),
    tagCategories: Object.fromEntries(
      listed.flatMap((t) => (t.category ? [[t.tag_id, t.category]] : []))
    ) as Record<string, TagCategory>,
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
   * A transaction write recording an admin's decision on a tag. Without
   * `previous` it decides a pending tag; with it, an approved or seeded one,
   * keeping its review to restore on undo. Either way it applies only while
   * the tag is still in that state, so a decision another admin made first,
   * or a form left open since, cancels the transaction.
   */
  decideItem(
    tag_id: string,
    decision: Required<Pick<Tag, "outcome" | "reviewed_by">> &
      Pick<Tag, "category" | "merged_into" | "changed" | "previous">
  ): TransactItem {
    const { set, values } = setting({
      ...decision,
      reviewed_at: new Date().toISOString(),
    });
    return {
      Update: {
        TableName: this.table,
        Key: { tag_id },
        UpdateExpression: `REMOVE pending SET ${set}`,
        ConditionExpression: decision.previous
          ? "attribute_exists(tag_id) AND attribute_not_exists(pending) AND (attribute_not_exists(outcome) OR outcome = :approved)"
          : "pending = :true",
        ExpressionAttributeValues: {
          ...values,
          ...(decision.previous ? { ":approved": "approved" } : { ":true": true }),
        },
      },
    };
  }

  /**
   * A transaction write undoing a decision: the tag goes back to its
   * `previous` review if it had one, or else back awaiting review. Applies
   * only while the tag has a decision to undo.
   */
  reopenItem(tag_id: string, previous?: Tag["previous"]): TransactItem {
    const restore: Record<string, unknown> = previous ?? { pending: true };
    const { set, values } = setting(restore);
    // A tag back awaiting review loses the category it was approved into; one
    // restored to its previous review keeps the category it still has.
    const remove = [
      ...REVIEW_FIELDS.filter((n) => !(n in restore)),
      ...(previous ? [] : ["category"]),
    ];
    return {
      Update: {
        TableName: this.table,
        Key: { tag_id },
        UpdateExpression: `${set ? `SET ${set} ` : ""}REMOVE ${remove.join(", ")}`,
        ConditionExpression: "attribute_exists(outcome)",
        ...(set && { ExpressionAttributeValues: values }),
      },
    };
  }

  /**
   * A transaction write adding an approved tag, for an admin renaming a tag
   * to a spelling the list lacks. Applies only where no tag of that name is
   * in use; a merged or rejected one is replaced, as a suggestion would. It
   * takes the `category` of the tag it renames, if that had one.
   */
  createItem(tag_id: string, reviewed_by: string, category?: TagCategory): TransactItem {
    const tag: Tag = {
      tag_id,
      ...(category && { category }),
      outcome: "approved",
      reviewed_by,
      reviewed_at: new Date().toISOString(),
    };
    return {
      Put: {
        TableName: this.table,
        Item: tag,
        ConditionExpression:
          "attribute_not_exists(tag_id) OR outcome = :merged OR outcome = :rejected",
        ExpressionAttributeValues: { ":merged": "merged", ":rejected": "rejected" },
      },
    };
  }
}

export const tagsTable = new TagsTable({});
