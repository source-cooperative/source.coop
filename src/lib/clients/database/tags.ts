import {
  DeleteCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { BaseTable } from "./base";

/**
 * A tag a product may carry. The id is the tag itself, the same string stored
 * in `product.metadata.tags`. A tag someone suggested is `pending` until an
 * admin approves, merges or rejects it; products may carry it meanwhile.
 */
export interface Tag {
  tag_id: string;
  pending?: boolean;
  suggested_by?: string;
  suggested_at?: string;
}

/** The product form's tag props: approved tags to pick, and pending ones. */
export function tagProps(tags: Tag[]) {
  return {
    tagOptions: tags.filter((t) => !t.pending).map((t) => t.tag_id),
    pendingTags: tags.filter((t) => t.pending).map((t) => t.tag_id),
  };
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
  async suggest(tag_id: string, suggested_by: string): Promise<void> {
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.table,
          Item: {
            tag_id,
            pending: true,
            suggested_by,
            suggested_at: new Date().toISOString(),
          },
          ConditionExpression: "attribute_not_exists(tag_id)",
        })
      );
    } catch (error) {
      if ((error as Error).name === "ConditionalCheckFailedException") return;
      this.logError("suggest", error, { tag_id });
      throw error;
    }
  }

  async approve(tag_id: string): Promise<void> {
    try {
      await this.client.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { tag_id },
          UpdateExpression: "REMOVE pending, suggested_by, suggested_at",
          ConditionExpression: "attribute_exists(tag_id)",
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
