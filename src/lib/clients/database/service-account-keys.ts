import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { ServiceAccountKeyRecord } from "@/types";
import { BaseTable } from "./base";

export class ServiceAccountKeysTable extends BaseTable {
  model = "service-account-keys";

  /** The exchange path: one key get by the hash the proxy presents. */
  async fetchByHash(key_hash: string): Promise<ServiceAccountKeyRecord | null> {
    const result = await this.cachedSend(
      new GetCommand({ TableName: this.table, Key: { key_hash } })
    );
    return (result.Item as ServiceAccountKeyRecord | undefined) ?? null;
  }

  async listByAccount(account_id: string): Promise<ServiceAccountKeyRecord[]> {
    const result = await this.cachedSend(
      new QueryCommand({
        TableName: this.table,
        IndexName: "account_id",
        KeyConditionExpression: "account_id = :account_id",
        ExpressionAttributeValues: { ":account_id": account_id },
      })
    );
    return (result.Items ?? []) as ServiceAccountKeyRecord[];
  }

  async create(key: ServiceAccountKeyRecord): Promise<ServiceAccountKeyRecord> {
    await this.client.send(
      new PutCommand({
        TableName: this.table,
        Item: key,
        ConditionExpression: "attribute_not_exists(key_hash)",
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
    key_hash: string,
    field: "revoked_at" | "expires_at" | "last_used_at",
    value: string | null
  ): Promise<void> {
    await this.client.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { key_hash },
        UpdateExpression: "SET #f = :v",
        ExpressionAttributeNames: { "#f": field },
        ExpressionAttributeValues: { ":v": value },
        ConditionExpression: "attribute_exists(key_hash)",
      })
    );
  }
}

export const serviceAccountKeysTable = new ServiceAccountKeysTable({});
