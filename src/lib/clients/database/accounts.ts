import {
  QueryCommand,
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

class AccountsTable extends BaseTable {
  model = "accounts";

  async fetchById(account_id: string): Promise<Account | null> {
    try {
      LOGGER.debug(`Trying to fetch account for ID`, {
        operation: "AccountsTable.fetchById",
        context: "database operation",
        metadata: { account_id },
      });
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.table,
          ExpressionAttributeValues: {
            ":account_id": account_id,
          },
          KeyConditionExpression: "account_id = :account_id",
        })
      );

      const account = result.Items?.pop();

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
      const result = await this.client.send(new BatchGetCommand(batchRequest));
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
      const result = await this.client.send(
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
      )?.pop();

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

  async create(account: Account): Promise<Account> {
    await this.client.send(
      new PutCommand({
        TableName: this.table,
        Item: account,
      })
    );

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
