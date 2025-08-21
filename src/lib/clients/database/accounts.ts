import {
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { ResourceNotFoundException } from "@aws-sdk/client-dynamodb";
import type { Account, AccountType } from "@/types/account";
import type {
  IndividualAccount,
  OrganizationalAccount,
} from "@/types/account_v2";

import { BaseTable } from "./base";

class AccountsTable extends BaseTable {
  tableName = "accounts";

  async fetchById(account_id: string): Promise<Account | null> {
    try {
      console.log(`DB: Trying to fetch account for ID:`, account_id);
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
        console.log(`DB: Found account for ID:`, account_id);
        return result.Items[0] as Account;
      }

      return null;
    } catch (error) {
      if (error instanceof ResourceNotFoundException) return null;

      this.logError("fetchById", error, { account_id });
      throw error;
    }
  }

  async fetchByOryId(identity_id: string): Promise<Account | null> {
    try {
      console.log(`DB: Trying to fetch account by Ory ID:`, identity_id);
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
        console.log(`DB: Found account by Ory ID:`, identity_id);
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

  async listOrgMembers(orgAccount: OrganizationalAccount): Promise<{
    owner: IndividualAccount | null;
    admins: IndividualAccount[];
    members: IndividualAccount[];
  }> {
    // Extract member IDs from the account's metadata
    const ownerId = orgAccount.metadata_public.owner_account_id;
    const adminIds = orgAccount.metadata_public.admin_account_ids || [];
    const memberIds = orgAccount.metadata_public.member_account_ids || [];

    // Fetch the owner account if available
    let owner: IndividualAccount | null = null;
    if (ownerId) {
      const ownerAccount = await this.fetchById(ownerId);
      if (!ownerAccount) {
        throw new Error(`Owner account ${ownerId} not found`);
      }
      if (isIndividualAccount(ownerAccount)) {
        owner = ownerAccount;
      } else {
        throw new Error(
          `Owner account ${ownerId} is not an individual account`
        );
      }
    }

    // Fetch admin accounts
    const adminPromises = adminIds.map(async (id: string) => {
      const account = await this.fetchById(id);
      if (!account) {
        throw new Error(`Admin account ${id} not found`);
      }
      if (!isIndividualAccount(account)) {
        throw new Error(`Admin account ${id} is not an individual account`);
      }
      return account;
    });
    const admins = await Promise.all(adminPromises);

    // Fetch member accounts
    const memberPromises = memberIds.map(async (id: string) => {
      const account = await this.fetchById(id);
      if (!account) {
        throw new Error(`Member account ${id} not found`);
      }
      if (!isIndividualAccount(account)) {
        throw new Error(`Member account ${id} is not an individual account`);
      }
      return account;
    });
    const members = await Promise.all(memberPromises);

    return {
      owner,
      admins,
      members,
    };
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
