import {
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DynamoDBDocumentClient,
  DeleteCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type {
  Account,
  IndividualAccount,
  OrganizationalAccount,
} from "@/types/account_v2";

// Use the singleton client from clients/index.ts
import { CONFIG } from "../../config";

class AccountsTable {
  private readonly table: string;
  private readonly client: DynamoDBDocumentClient;

  constructor({
    client,
    table = "sc-accounts",
  }: {
    table?: string;
    client?: DynamoDBDocumentClient;
  }) {
    this.table = table;
    if (client) {
      this.client = client;
    } else {
      const client = new DynamoDBClient(CONFIG.database);
      this.client = DynamoDBDocumentClient.from(client);
    }
  }

  async fetchById(account_id: string): Promise<Account | null> {
    const types = ["individual", "organization"] as const;

    for (const type of types) {
      console.log(
        `DB: Trying to fetch account of type ${type} for ID:`,
        account_id
      );
      const result = await this.client.send(
        new GetCommand({
          TableName: this.table,
          Key: { account_id, type },
        })
      );

      if (result.Item) {
        console.log(`DB: Found account of type ${type} for ID:`, account_id);
        return result.Item as Account;
      }
    }

    return null;
  }

  async fetchByEmail(email: string): Promise<Account> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.table,
        IndexName: "AccountEmailIndex",
        KeyConditionExpression: "emails = :email",
        ExpressionAttributeValues: {
          ":email": email,
        },
        Limit: 1,
      })
    );

    if (!result.Items || result.Items.length === 0) {
      throw new Error(`No account found for email: ${email}`);
    }

    return result.Items[0] as Account;
  }

  async listByType(type: "individual" | "organization"): Promise<Account[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.table,
        IndexName: "AccountTypeIndex",
        KeyConditionExpression: "#type = :type",
        ExpressionAttributeNames: {
          "#type": "type",
        },
        ExpressionAttributeValues: {
          ":type": type,
        },
      })
    );

    return (result.Items || []) as Account[];
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
          type: account.type,
        },
        UpdateExpression:
          "SET #name = :name, emails = :emails, updated_at = :updated_at, disabled = :disabled, flags = :flags, metadata_public = :metadata_public, metadata_private = :metadata_private",
        ExpressionAttributeNames: {
          "#name": "name", // name is a reserved word in DynamoDB
        },
        ExpressionAttributeValues: {
          ":name": account.name,
          ":emails": account.emails,
          ":updated_at": new Date().toISOString(),
          ":disabled": account.disabled,
          ":flags": account.flags,
          ":metadata_public": account.metadata_public,
          ":metadata_private": account.metadata_private,
        },
        ReturnValues: "ALL_NEW",
      })
    );

    return result.Attributes as Account;
  }

  async delete(Key: {
    account_id: string;
    type: "individual" | "organization";
  }): Promise<void> {
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
