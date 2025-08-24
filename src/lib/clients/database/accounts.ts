import {
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  PutCommand,
  BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";
import { ResourceNotFoundException } from "@aws-sdk/client-dynamodb";
import type {
  Account,
  AccountType,
  IndividualAccount,
  OrganizationalAccount,
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

      if (result.Items?.length) {
        LOGGER.debug(`Found account for ID`, {
          operation: "AccountsTable.fetchById",
          context: "database operation",
          metadata: { account_id },
        });
        return result.Items[0] as Account;
      }

      return null;
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

      console.debug(
        `DB: Fetching ${batch.length} accounts: ${batch.join(", ")}`
      );
      const result = await this.client.send(new BatchGetCommand(batchRequest));
      if (result.Responses?.[this.table]) {
        accountBatches.push(...(result.Responses[this.table] as Account[]));
      }
    }

    return accountBatches;
  }

  async fetchByOryId(identity_id: string): Promise<Account | null> {
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

      if (result.Items && result.Items.length > 0) {
        LOGGER.debug(`Found account by Ory ID`, {
          operation: "AccountsTable.fetchByOryId",
          context: "database operation",
          metadata: { identity_id },
        });
        return result.Items[0] as Account;
      }

      return null;
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
    const result = await this.client.send(
      new UpdateCommand({
        TableName: this.table,
        Key: {
          account_id: account.account_id,
        },
        UpdateExpression:
          "SET #name = :name, #type = :type, emails = :emails, updated_at = :updated_at, disabled = :disabled, flags = :flags, metadata_public = :metadata_public, metadata_private = :metadata_private, identity_id = :identity_id",
        ExpressionAttributeNames: {
          "#name": "name", // name is a reserved word in DynamoDB
          "#type": "type", // type is also a reserved word in DynamoDB
        },
        ExpressionAttributeValues: {
          ":type": account.type,
          ":name": account.name,
          ":emails": account.emails,
          ":updated_at": new Date().toISOString(),
          ":disabled": account.disabled,
          ":flags": account.flags,
          ":metadata_public": account.metadata_public,
          ":metadata_private": account.metadata_private,
          ":identity_id":
            account.identity_id || account.metadata_private?.identity_id,
        },
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
  acc.type === "individual";

export const isOrganizationalAccount = (
  acc: Account
): acc is OrganizationalAccount => acc.type === "organization";

// Export a singleton instance
export const accountsTable = new AccountsTable({});
