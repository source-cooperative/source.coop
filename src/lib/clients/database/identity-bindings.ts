import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { ResourceNotFoundException } from "@aws-sdk/client-dynamodb";
import { CONFIG } from "@/lib/config";
import type { IdentityBinding } from "@/types";
import { BaseTable } from "./base";

/** The issuer every Ory identity is bound under: this environment's Ory project. */
export function oryIssuer(): string {
  return CONFIG.auth.api.backendUrl ?? "";
}

export class IdentityBindingsTable extends BaseTable {
  model = "identity-bindings";

  /** The binding for `subject` as named by `issuer`, or null. */
  async resolve(
    issuer: string,
    subject: string
  ): Promise<IdentityBinding | null> {
    try {
      const result = await this.cachedSend(
        new GetCommand({ TableName: this.table, Key: { issuer, subject } })
      );
      return (result.Item as IdentityBinding | undefined) ?? null;
    } catch (error) {
      // The app may deploy before the table does; until then nothing is bound.
      if (error instanceof ResourceNotFoundException) return null;
      this.logError("resolve", error, { issuer, subject });
      throw error;
    }
  }

  async listByAccount(account_id: string): Promise<IdentityBinding[]> {
    const result = await this.cachedSend(
      new QueryCommand({
        TableName: this.table,
        IndexName: "account_id",
        KeyConditionExpression: "account_id = :account_id",
        ExpressionAttributeValues: { ":account_id": account_id },
      })
    );
    return (result.Items ?? []) as IdentityBinding[];
  }

  /**
   * Binds the pair, or throws `ConditionalCheckFailedException` if it is
   * already bound — to this account or any other.
   */
  async create(binding: IdentityBinding): Promise<IdentityBinding> {
    await this.client.send(
      new PutCommand({
        TableName: this.table,
        Item: binding,
        ConditionExpression: "attribute_not_exists(issuer)",
      })
    );
    return binding;
  }

  async delete(issuer: string, subject: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({ TableName: this.table, Key: { issuer, subject } })
    );
  }
}

export const identityBindingsTable = new IdentityBindingsTable({});
