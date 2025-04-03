import { _DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { _DynamoDBDocument, GetCommand, QueryCommand, BatchGetCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Account, IndividualAccount, OrganizationalAccount, Repository } from '@/types';
import { _CONFIG } from '../config';

// Use the singleton client from clients/index.ts
import { getDynamoDb } from '../clients';

const docClient = getDynamoDb();

/**
 * Core account operations
 */

export async function fetchAccount(account_id: string): Promise<Account | null> {
  try {
    console.log('DB: Fetching account with ID:', account_id);
    // Try both individual and organization types
    const types = ['individual', 'organization'] as const;
    
    for (const type of types) {
      console.log(`DB: Trying to fetch account of type ${type} for ID:`, account_id);
      const result = await docClient.send(new GetCommand({
        TableName: "sc-accounts",
        Key: {
          account_id,
          type
        }
      }));
      
      if (result.Item) {
        console.log(`DB: Found account of type ${type} for ID:`, account_id);
        return result.Item as Account;
      }
    }
    
    console.log('DB: No account found for ID:', account_id);
    return null;
  } catch (e) {
    console.error(`Error fetching account with account_id ${account_id}:`, e);
    return null;
  }
}

export async function fetchAccountByEmail(email: string): Promise<Account | null> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: "sc-accounts",
      IndexName: "AccountEmailIndex",
      KeyConditionExpression: "emails = :email",
      ExpressionAttributeValues: {
        ":email": email
      },
      Limit: 1
    }));

    if (!result.Items || result.Items.length === 0) return null;
    return result.Items[0] as Account;
  } catch (e) {
    console.error(`Error fetching account by email ${email}:`, e);
    return null;
  }
}

export async function fetchAccountsByType(type: 'individual' | 'organization'): Promise<Account[]> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: "sc-accounts",
      IndexName: "AccountTypeIndex",
      KeyConditionExpression: "#type = :type",
      ExpressionAttributeNames: {
        "#type": "type"
      },
      ExpressionAttributeValues: {
        ":type": type
      }
    }));

    return (result.Items || []) as Account[];
  } catch (e) {
    console.error(`Error fetching accounts by type ${type}:`, e);
    return [];
  }
}

export async function updateAccount(account: Account): Promise<boolean> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: "sc-accounts",
      Key: {
        account_id: account.account_id,
        type: account.type
      },
      UpdateExpression: "SET #name = :name, emails = :emails, updated_at = :updated_at, disabled = :disabled, flags = :flags, metadata_public = :metadata_public, metadata_private = :metadata_private",
      ExpressionAttributeNames: {
        "#name": "name" // name is a reserved word in DynamoDB
      },
      ExpressionAttributeValues: {
        ":name": account.name,
        ":emails": account.emails,
        ":updated_at": new Date().toISOString(),
        ":disabled": account.disabled,
        ":flags": account.flags,
        ":metadata_public": account.metadata_public,
        ":metadata_private": account.metadata_private
      }
    }));
    return true;
  } catch (e) {
    console.error(`Error updating account ${account.account_id}:`, e);
    return false;
  }
}

/**
 * Core repository operations
 */

export async function fetchRepository(repository_id: string, account_id: string): Promise<Repository | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: "sc-repositories",
      Key: {
        repository_id,
        account_id
      }
    }));

    return result.Item as Repository || null;
  } catch (e) {
    console.error(`Error fetching repository ${repository_id}:`, e);
    return null;
  }
}

export async function fetchRepositoriesByAccount(account_id: string): Promise<Repository[]> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: "sc-repositories",
      IndexName: "AccountRepositoriesIndex",
      KeyConditionExpression: "account_id = :account_id",
      ExpressionAttributeValues: {
        ":account_id": account_id
      }
    }));

    return (result.Items || []) as Repository[];
  } catch (e) {
    console.error(`Error fetching repositories for account ${account_id}:`, e);
    return [];
  }
}

export async function fetchPublicRepositories(limit = 50): Promise<Repository[]> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: "sc-repositories",
      IndexName: "PublicRepositoriesIndex",
      KeyConditionExpression: "visibility = :visibility",
      ExpressionAttributeValues: {
        ":visibility": "public"
      },
      Limit: limit
    }));

    return (result.Items || []) as Repository[];
  } catch (e) {
    console.error(`Error fetching public repositories:`, e);
    return [];
  }
}

export async function updateRepository(repository: Repository): Promise<boolean> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: "sc-repositories",
      Key: {
        repository_id: repository.repository_id,
        account_id: repository.account_id
      },
      UpdateExpression: "SET title = :title, description = :description, updated_at = :updated_at, visibility = :visibility, metadata = :metadata",
      ExpressionAttributeValues: {
        ":title": repository.title,
        ":description": repository.description,
        ":updated_at": new Date().toISOString(),
        ":visibility": repository.visibility,
        ":metadata": repository.metadata
      }
    }));
    return true;
  } catch (e) {
    console.error(`Error updating repository ${repository.repository_id}:`, e);
    return false;
  }
}

// Type guards
export const isIndividualAccount = (acc: Account): acc is IndividualAccount => 
  acc.type === 'individual';

export const isOrganizationalAccount = (acc: Account): acc is OrganizationalAccount => 
  acc.type === 'organization'; 