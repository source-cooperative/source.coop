import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { BaseTable } from "./base";

/**
 * The tags a product may carry. Each row is `{ tag_id }`, and the id is the tag
 * itself, the same string stored in `product.metadata.tags`. The corpus is
 * curated outside the app; the app only reads it.
 */
export class TagsTable extends BaseTable {
  model = "tags";

  /** Every tag, sorted. */
  async listAll(): Promise<string[]> {
    const tags: string[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    try {
      do {
        const result = await this.cachedSend(
          new ScanCommand({ TableName: this.table, ExclusiveStartKey })
        );
        tags.push(...(result.Items ?? []).map((item) => item.tag_id as string));
        ExclusiveStartKey = result.LastEvaluatedKey;
      } while (ExclusiveStartKey);
    } catch (error) {
      this.logError("listAll", error);
      throw error;
    }
    return tags.sort();
  }
}

export const tagsTable = new TagsTable({});
