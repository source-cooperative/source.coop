import { APIKey } from "@/types";
import {
  PutItemCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import { QueryCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { BaseTable } from "./base";

/**
 * Class for managing API key operations in DynamoDB
 */
export class APIKeysTable extends BaseTable {
  async fetchById(accessKeyId: string): Promise<APIKey | null> {
    try {
      const result = await this.client.send(
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

      const result = await this.client.send(command);
      return result.Items?.map((item) => item as APIKey) ?? [];
    } catch (error) {
      this.logError("listByAccount", error, { accountId, repositoryId });
      throw error;
    }
  }

  async create(apiKey: APIKey): Promise<APIKey> {
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.table,
          Item: apiKey,
        })
      );
      return apiKey;
    } catch (error) {
      this.logError("create", error, { accessKeyId: apiKey.access_key_id });
      throw error;
    }
  }

  async update(apiKey: APIKey): Promise<APIKey> {
    try {
      const result = await this.client.send(
        new UpdateCommand({
          TableName: this.table,
          Key: {
            access_key_id: apiKey.access_key_id,
          },
          UpdateExpression:
            "SET account_id = :account_id, repository_id = :repository_id, disabled = :disabled, expires = :expires, name = :name, secret_access_key = :secret_access_key",
          ExpressionAttributeValues: {
            ":account_id": apiKey.account_id,
            ":repository_id": apiKey.repository_id,
            ":disabled": apiKey.disabled,
            ":expires": apiKey.expires,
            ":name": apiKey.name,
            ":secret_access_key": apiKey.secret_access_key,
          },
          ReturnValues: "ALL_NEW",
        })
      );
      return result.Attributes as APIKey;
    } catch (error) {
      this.logError("update", error, { accessKeyId: apiKey.access_key_id });
      throw error;
    }
  }

  // Legacy method for backward compatibility - renamed to upsert
  async upsert(
    apiKey: APIKey,
    checkIfExists: boolean = false
  ): Promise<[APIKey, boolean]> {
    try {
      const command = new PutItemCommand({
        TableName: this.table,
        Item: marshall(apiKey),
        ConditionExpression: checkIfExists
          ? "attribute_not_exists(access_key_id)"
          : undefined,
      });

      await this.client.send(command);
      return [apiKey, true];
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        return [apiKey, false];
      }
      this.logError("upsert", error, { accessKeyId: apiKey.access_key_id });
      throw error;
    }
  }
}
// Export singleton instances

export const apiKeysTable = new APIKeysTable({ table: "sc-api-keys" });
