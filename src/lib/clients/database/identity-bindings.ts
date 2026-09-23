import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { IdentityBinding } from "@/types";
import { BaseTable } from "./base";

/** The (issuer, subject) pair already resolves to an account. */
export class IdentityAlreadyBoundError extends Error {
  constructor(issuer: string, subject: string) {
    super(`Identity already bound: ${issuer} ${subject}`);
    this.name = "IdentityAlreadyBoundError";
  }
}

/**
 * Both halves of the key must be real. An issuer read from unset config would
 * be `""`, and every binding written under it would share one partition and
 * answer for each other.
 */
function requireKey(issuer: string, subject: string): void {
  if (!issuer || !subject) {
    throw new Error("An identity binding needs both an issuer and a subject");
  }
}

/**
 * Subjects the platform cannot derive from an account — a GitHub Actions
 * workflow, whatever platform IdP comes next — resolved to the account they
 * belong to. An individual's Ory identity is not one of them: it stays on the
 * account row as `identity_id`, where the session, the email lookup and the
 * proxy credentials already read it. Nor is an API key's subject, which is the
 * service account's own id and resolves by id.
 */
export class IdentityBindingsTable extends BaseTable {
  model = "identity-bindings";

  /** The binding for `subject` as named by `issuer`, or null. */
  async resolve(
    issuer: string,
    subject: string
  ): Promise<IdentityBinding | null> {
    requireKey(issuer, subject);
    try {
      const result = await this.cachedSend(
        new GetCommand({ TableName: this.table, Key: { issuer, subject } })
      );
      return (result.Item as IdentityBinding | undefined) ?? null;
    } catch (error) {
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
    requireKey(binding.issuer, binding.subject);
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
