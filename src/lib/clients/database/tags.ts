import {
  DeleteCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Product } from "@/types";
import { BaseTable } from "./base";

/**
 * A tag a product may carry. The id is the tag itself, the same string stored
 * in `product.metadata.tags`. A tag someone suggested is `pending` until an
 * admin approves, merges or rejects it; products may carry it meanwhile.
 */
export interface Tag {
  tag_id: string;
  pending?: boolean;
  /** Who suggested it and when. Tags seeded from the original cleanup have neither. */
  suggested_by?: string;
  suggested_at?: string;
  /** Which admin approved it and when, once one has. */
  approved_by?: string;
  approved_at?: string;
}

/**
 * The product form's tag props: approved tags to pick, and which of the
 * product's own tags are pending. Other products' pending tags aren't
 * public, so they stay on the server.
 */
export function tagProps(tags: Tag[], current: string[] = []) {
  return {
    tagOptions: tags.filter((t) => !t.pending).map((t) => t.tag_id),
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

export class TagsTable extends BaseTable {
  model = "tags";

  /** Every tag, approved and pending, sorted by id. */
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

  /** Adds a pending tag. A tag that already exists is left as it is. */
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
          ConditionExpression: "attribute_not_exists(tag_id)",
        })
      );
      return tag;
    } catch (error) {
      // Someone else's suggestion landed first; the tag exists either way.
      if ((error as Error).name === "ConditionalCheckFailedException") {
        return { tag_id };
      }
      this.logError("suggest", error, { tag_id });
      throw error;
    }
  }

  /** Approves a tag, keeping who suggested it and recording who approved it. */
  async approve(tag_id: string, approved_by: string): Promise<void> {
    try {
      await this.client.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { tag_id },
          UpdateExpression:
            "REMOVE pending SET approved_by = :by, approved_at = :at",
          ConditionExpression: "attribute_exists(tag_id)",
          ExpressionAttributeValues: {
            ":by": approved_by,
            ":at": new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      this.logError("approve", error, { tag_id });
      throw error;
    }
  }

  async delete(tag_id: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteCommand({ TableName: this.table, Key: { tag_id } })
      );
    } catch (error) {
      this.logError("delete", error, { tag_id });
      throw error;
    }
  }
}

export const tagsTable = new TagsTable({});
