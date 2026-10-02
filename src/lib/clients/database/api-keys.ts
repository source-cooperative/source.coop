import { APIKey } from "@/types";
import { ResourceNotFoundException } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { BaseTable } from "./base";

/**
 * Class for managing API key operations in DynamoDB
 */
export class APIKeysTable extends BaseTable {
  model = "api-keys";

  async fetchById(accessKeyId: string): Promise<APIKey | null> {
    try {
      const result = await this.cachedSend(
        new QueryCommand({
          TableName: this.table,
          KeyConditionExpression: "access_key_id = :access_key_id",
          ExpressionAttributeValues: {
            ":access_key_id": accessKeyId,
          },
        })
      );
      return (result.Items?.[0] as APIKey) ?? null;
    } catch (error) {
      if (error instanceof ResourceNotFoundException) return null;

      this.logError("fetchById", error, { accessKeyId });
      throw error;
    }
  }

  async listByAccount(
    accountId: string,
    repositoryId?: string
  ): Promise<APIKey[]> {
    try {
      const command = new QueryCommand({
        TableName: this.table,
        IndexName: "account_id",
        KeyConditionExpression: "account_id = :account_id",
        FilterExpression: repositoryId
          ? "repository_id = :repository_id"
          : "attribute_not_exists(repository_id)",
        ExpressionAttributeValues: {
          ":account_id": accountId,
          ...(repositoryId && { ":repository_id": repositoryId }),
        },
      });

      const result = await this.cachedSend(command);
      return result.Items?.map((item) => item as APIKey) ?? [];
    } catch (error) {
      this.logError("listByAccount", error, { accountId, repositoryId });
      throw error;
    }
  }

  async delete(accessKeyId: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteCommand({
          TableName: this.table,
          Key: { access_key_id: accessKeyId },
        })
      );
    } catch (error) {
      this.logError("delete", error, { accessKeyId });
      throw error;
    }
  }
}
// Export singleton instances

export const apiKeysTable = new APIKeysTable({});
