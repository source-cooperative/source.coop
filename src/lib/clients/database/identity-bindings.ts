import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { IdentityBindingSchema, type IdentityBinding } from "@/types";
import { BaseTable } from "./base";

/** The (issuer, subject) pair already resolves to an account. */
export class IdentityAlreadyBoundError extends Error {
  constructor(issuer: string, subject: string) {
    super(`Identity already bound: ${issuer} ${subject}`);
    this.name = "IdentityAlreadyBoundError";
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

  /**
   * An account's bindings. A destructive caller passes `bypassCache` so it
   * acts on what the table holds now, not on a read memoized earlier in the
   * request that may predate a binding.
   */
  async listByAccount(
    account_id: string,
    bypassCache = false
  ): Promise<IdentityBinding[]> {
    const command = new QueryCommand({
      TableName: this.table,
      IndexName: "account_id",
      KeyConditionExpression: "account_id = :account_id",
      ExpressionAttributeValues: { ":account_id": account_id },
    });
    const result = bypassCache
      ? await this.client.send(command)
      : await this.cachedSend(command);
    return (result.Items ?? []) as IdentityBinding[];
  }

  /**
   * Binds the pair, or throws `IdentityAlreadyBoundError` if it is already
   * bound — to this account or any other. The row is validated first: an
   * issuer read from unset config would be `""`, and every binding written
   * under it would share one partition.
   */
  async create(binding: IdentityBinding): Promise<IdentityBinding> {
    const row = IdentityBindingSchema.parse(binding);
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.table,
          Item: row,
          ConditionExpression: "attribute_not_exists(issuer)",
        })
      );
    } catch (error) {
      if ((error as { name?: string })?.name === "ConditionalCheckFailedException") {
        throw new IdentityAlreadyBoundError(row.issuer, row.subject);
      }
      this.logError("create", error, { account_id: row.account_id });
      throw error;
    }
    return row;
  }

  async delete(issuer: string, subject: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({ TableName: this.table, Key: { issuer, subject } })
    );
  }
}

export const identityBindingsTable = new IdentityBindingsTable({});
