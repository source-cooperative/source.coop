import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { ServiceAccountKey } from "@/types";
import { BaseTable } from "./base";

export class ServiceAccountKeysTable extends BaseTable {
  model = "service-account-keys";

  async fetchByJti(jti: string): Promise<ServiceAccountKey | null> {
    const result = await this.cachedSend(
      new GetCommand({ TableName: this.table, Key: { jti } })
    );
    return (result.Item as ServiceAccountKey | undefined) ?? null;
  }

  async listByAccount(account_id: string): Promise<ServiceAccountKey[]> {
    const result = await this.cachedSend(
      new QueryCommand({
        TableName: this.table,
        IndexName: "account_id",
        KeyConditionExpression: "account_id = :account_id",
        ExpressionAttributeValues: { ":account_id": account_id },
      })
    );
    return (result.Items ?? []) as ServiceAccountKey[];
  }

  async create(key: ServiceAccountKey): Promise<ServiceAccountKey> {
    await this.client.send(
      new PutCommand({
        TableName: this.table,
        Item: key,
        ConditionExpression: "attribute_not_exists(jti)",
      })
    );
    return key;
  }

  /**
   * Sets one field and leaves the rest as the server has them, so a
   * revocation that lands between a caller's read and its write survives it.
   * Only an existing record is written: nothing may resurrect a deleted key.
   */
  async set(
    jti: string,
    field: "revoked_at" | "expires_at" | "last_used_at",
    value: string | null
  ): Promise<void> {
    await this.client.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { jti },
        UpdateExpression: "SET #f = :v",
        ExpressionAttributeNames: { "#f": field },
        ExpressionAttributeValues: { ":v": value },
        ConditionExpression: "attribute_exists(jti)",
      })
    );
  }

  async delete(jti: string): Promise<void> {
    await this.client.send(new DeleteCommand({ TableName: this.table, Key: { jti } }));
  }
}

export const serviceAccountKeysTable = new ServiceAccountKeysTable({});
