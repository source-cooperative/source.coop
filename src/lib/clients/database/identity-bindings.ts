import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { ResourceNotFoundException } from "@aws-sdk/client-dynamodb";
import { CONFIG } from "@/lib/config";
import { LOGGER } from "@/lib/logging";
import type { IdentityBinding } from "@/types";
import { BaseTable } from "./base";

/** The (issuer, subject) pair already resolves to an account. */
export class IdentityAlreadyBoundError extends Error {
  constructor(issuer: string, subject: string) {
    super(`Identity already bound: ${issuer} ${subject}`);
    this.name = "IdentityAlreadyBoundError";
  }
}

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
   * Binds the pair, or throws `IdentityAlreadyBoundError` if it is already
   * bound — to this account or any other.
   */
  async create(binding: IdentityBinding): Promise<IdentityBinding> {
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.table,
          Item: binding,
          ConditionExpression: "attribute_not_exists(issuer)",
        })
      );
    } catch (error) {
      if ((error as { name?: string })?.name === "ConditionalCheckFailedException") {
        throw new IdentityAlreadyBoundError(binding.issuer, binding.subject);
      }
      // The app may deploy before the table does. The identity_id fallback
      // still resolves the account, and the backfill writes this binding later.
      if (error instanceof ResourceNotFoundException) {
        LOGGER.warn("Identity binding not written: table does not exist yet", {
          operation: "IdentityBindingsTable.create",
          metadata: { account_id: binding.account_id },
        });
        return binding;
      }
      this.logError("create", error, { account_id: binding.account_id });
      throw error;
    }
    return binding;
  }

  async delete(issuer: string, subject: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({ TableName: this.table, Key: { issuer, subject } })
    );
  }
}

export const identityBindingsTable = new IdentityBindingsTable({});
