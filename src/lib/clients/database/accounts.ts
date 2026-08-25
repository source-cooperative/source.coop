import {
  QueryCommand,
  ScanCommand,
  type ScanCommandOutput,
  UpdateCommand,
  DeleteCommand,
  PutCommand,
  BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";
import { ResourceNotFoundException } from "@aws-sdk/client-dynamodb";
import {
  type Account,
  AccountType,
  type IndividualAccount,
  type OrganizationalAccount,
} from "@/types";

import { BaseTable } from "./base";
import { LOGGER } from "@/lib/logging";

/**
 * What a type-ahead picker needs to introduce an account: enough to render the
 * same identity block the profile hover card shows. Public fields only.
 */
export interface AccountSuggestion {
  account_id: string;
  name: string;
  profile_image?: string;
}

export class AccountsTable extends BaseTable {
  model = "accounts";

  async fetchById(account_id: string): Promise<Account | null> {
    try {
      LOGGER.debug(`Trying to fetch account for ID`, {
        operation: "AccountsTable.fetchById",
        context: "database operation",
        metadata: { account_id },
      });
      const result = await this.cachedSend(
        new QueryCommand({
          TableName: this.table,
          ExpressionAttributeValues: {
            ":account_id": account_id,
          },
          KeyConditionExpression: "account_id = :account_id",
        })
      );

      // Non-mutating last-item access: the response may be a shared, request-
      // cached object, so we must not `.pop()` (which would empty it).
      const account = result.Items?.at(-1);

      if (!account) return null;

      LOGGER.debug(`Found account by ID`, {
        operation: "AccountsTable.fetchById",
        context: "database operation",
        metadata: { account_id, account },
      });
      return account as Account;
    } catch (error) {
      if (error instanceof ResourceNotFoundException) return null;

      this.logError("fetchById", error, { account_id });
      throw error;
    }
  }

  async fetchManyByIds(
    account_ids: string[],
    batchSize = 100
  ): Promise<Account[]> {
    const accountBatches: Account[] = [];

    // Remove duplicates
    account_ids = [...new Set(account_ids)];

    for (let i = 0; i < account_ids.length; i += batchSize) {
      const batch = account_ids.slice(i, i + batchSize);
      const batchRequest = {
        RequestItems: {
          [this.table]: {
            Keys: batch.map((account_id) => ({ account_id })),
          },
        },
      };

      LOGGER.debug(
        `DB: Fetching ${batch.length} accounts: ${batch.join(", ")}`,
        {
          operation: "AccountsTable.fetchManyByIds",
          context: "database operation",
          metadata: { batch },
        }
      );
      const result = await this.cachedSend(new BatchGetCommand(batchRequest));
      if (result.Responses?.[this.table]) {
        accountBatches.push(...(result.Responses[this.table] as Account[]));
      }
    }

    return accountBatches;
  }

  async fetchByOryId(identity_id: string): Promise<IndividualAccount | null> {
    try {
      LOGGER.debug(`Trying to fetch account by Ory ID`, {
        operation: "AccountsTable.fetchByOryId",
        context: "database operation",
        metadata: { identity_id },
      });
      const result = await this.cachedSend(
        new QueryCommand({
          TableName: this.table,
          IndexName: "identity_id",
          KeyConditionExpression: "identity_id = :identity_id",
          ExpressionAttributeValues: {
            ":identity_id": identity_id,
          },
        })
      );

      const account = result.Items?.filter((item) =>
        isIndividualAccount(item as Account)
      )?.at(-1);

      if (!account) return null;

      LOGGER.debug(`Found account by Ory ID`, {
        operation: "AccountsTable.fetchByOryId",
        context: "database operation",
        metadata: { identity_id, account },
      });
      return account as IndividualAccount;
    } catch (error) {
      if (error instanceof ResourceNotFoundException) return null;

      this.logError("fetchByOryId", error, { identity_id });
      throw error;
    }
  }

  /**
   * Creates an account, failing if `account_id` is already taken.
   *
   * `account_id` is the table's partition key, so an unconditioned `PutCommand`
   * would *replace* an existing row rather than fail. `account_id` is chosen by
   * the caller at signup and never checked for availability beforehand, so the
   * conditional write is what keeps one account from being written over another
   * -- including one bound to a different `identity_id`.
   *
   * Throws `ConditionalCheckFailedException` when the id is taken; callers that
   * accept a user-supplied id should catch it and report the collision rather
   * than surfacing a server error.
   */
  /**
   * Substring match over individual accounts' handles and display names, for
   * type-ahead pickers. Returns only publicly visible identity fields --
   * `profile_image` comes from `metadata_public` and is what profile pages
   * already render. Deliberately no email: the Gravatar fallback used elsewhere
   * would leak an address hash for every account a search happens to match.
   *
   * ponytail: full table scan filtered app-side. DynamoDB has no
   * case-insensitive `contains()` and this table has no search index, so
   * matching on `name` any other way means denormalizing a lowercased
   * `search_text` field (as `products` does) and backfilling it. Fine at the
   * current account count; do that — or move to a search service — if the
   * scans start to hurt.
   */
  async searchIndividuals(
    query: string,
    limit = 10
  ): Promise<AccountSuggestion[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matches: AccountSuggestion[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined = undefined;

    do {
      // Annotated because the paging assignment below otherwise makes the
      // inferred type of `result` depend on itself.
      const result: ScanCommandOutput = await this.cachedSend(
        new ScanCommand({
          TableName: this.table,
          ProjectionExpression:
            "account_id, #name, #type, disabled, metadata_public.profile_image",
          ExpressionAttributeNames: { "#name": "name", "#type": "type" },
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );

      for (const item of (result.Items ?? []) as Account[]) {
        if (item.type !== AccountType.INDIVIDUAL || item.disabled) continue;
        const name = item.name ?? "";
        if (!item.account_id.includes(q) && !name.toLowerCase().includes(q))
          continue;
        matches.push({
          account_id: item.account_id,
          name,
          profile_image: item.metadata_public?.profile_image,
        });
        if (matches.length >= limit) return matches;
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return matches;
  }

  async create(account: Account): Promise<Account> {
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.table,
          Item: account,
          ConditionExpression: "attribute_not_exists(account_id)",
        })
      );
    } catch (error) {
      if ((error as { name?: string })?.name !== "ConditionalCheckFailedException") {
        this.logError("create", error, { account_id: account.account_id });
      }
      throw error;
    }

    return account;
  }

  async update(account: Account): Promise<Account> {
    const updateParts: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};

    // Always update these core fields
    updateParts.push("#name = :name", "#type = :type", "updated_at = :updated_at");
    expressionAttributeValues[":type"] = account.type;
    expressionAttributeValues[":name"] = account.name;
    expressionAttributeValues[":updated_at"] = new Date().toISOString();

    // Conditionally add fields that might be undefined
    if (account.emails !== undefined) {
      updateParts.push("emails = :emails");
      expressionAttributeValues[":emails"] = account.emails;
    }

    if (account.disabled !== undefined) {
      updateParts.push("disabled = :disabled");
      expressionAttributeValues[":disabled"] = account.disabled;
    }

    if (account.flags !== undefined) {
      updateParts.push("flags = :flags");
      expressionAttributeValues[":flags"] = account.flags;
    }

    if (account.metadata_public !== undefined) {
      updateParts.push("metadata_public = :metadata_public");
      expressionAttributeValues[":metadata_public"] = account.metadata_public;
    }

    if (account.metadata_private !== undefined) {
      updateParts.push("metadata_private = :metadata_private");
      expressionAttributeValues[":metadata_private"] = account.metadata_private;
    }

    // Only include identity_id if it exists (for Individual accounts)
    const identityId =
      account.identity_id || account.metadata_private?.identity_id;
    if (identityId) {
      updateParts.push("identity_id = :identity_id");
      expressionAttributeValues[":identity_id"] = identityId;
    }

    const result = await this.client.send(
      new UpdateCommand({
        TableName: this.table,
        Key: {
          account_id: account.account_id,
        },
        UpdateExpression: `SET ${updateParts.join(", ")}`,
        ExpressionAttributeNames: {
          "#name": "name", // name is a reserved word in DynamoDB
          "#type": "type", // type is also a reserved word in DynamoDB
        },
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
      })
    );

    return result.Attributes as Account;
  }

  async delete(Key: { account_id: string; type: AccountType }): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: this.table,
        Key,
      })
    );
  }
}

// Type guards
export const isIndividualAccount = (acc: Account): acc is IndividualAccount =>
  acc.type === AccountType.INDIVIDUAL;

export const isOrganizationalAccount = (
  acc: Account
): acc is OrganizationalAccount => acc.type === AccountType.ORGANIZATION;

// Export a singleton instance
export const accountsTable = new AccountsTable({});
