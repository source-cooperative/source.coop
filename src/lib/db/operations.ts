import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument, GetCommand, QueryCommand, BatchGetCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Account, IndividualAccount, OrganizationalAccount, Repository } from '@/types';
import { CONFIG } from '../config';

// Use the singleton client from clients/index.ts
import { getDynamoDb } from '../clients';

const docClient = getDynamoDb();

export async function fetchAccount(account_id: string): Promise<Account | null> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: "Accounts",
      KeyConditionExpression: "account_id = :account_id",
      ExpressionAttributeValues: {
        ":account_id": account_id
      },
      Limit: 1
    }));

    if (!result.Items || result.Items.length === 0) return null;
    return result.Items[0] as Account;
  } catch (e) {
    console.error("Error fetching account:", e);
    return null;
  }
}

export async function fetchRepositoriesByAccount(account_id: string): Promise<Repository[]> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: "Repositories",
      IndexName: "account_id-index",
      KeyConditionExpression: "account_id = :account_id",
      ExpressionAttributeValues: {
        ":account_id": account_id
      }
    }));

    return result.Items as Repository[] || [];
  } catch (e) {
    console.error("Error fetching repositories:", e);
    return [];
  }
}

export async function fetchAccountsByIds(account_ids: string[]): Promise<Account[]> {
  // If no account IDs provided, return empty array
  if (!account_ids.length) {
    return [];
  }

  const batchSize = 100; // DynamoDB batch limit
  const results: Account[] = [];

  // Remove duplicates while preserving order
  const uniqueIds = Array.from(new Set(account_ids));

  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    try {
      const result = await docClient.send(new BatchGetCommand({
        RequestItems: {
          "Accounts": {
            Keys: batch.map(id => ({ account_id: id }))
          }
        }
      }));

      if (result.Responses?.Accounts) {
        results.push(...result.Responses.Accounts as Account[]);
      }
    } catch (e) {
      console.error("Error fetching accounts batch:", e);
      // Continue with other batches even if one fails
    }
  }

  return results;
}

export async function fetchOrganizationMembers(organization: OrganizationalAccount): Promise<{
  admins: IndividualAccount[];
  members: IndividualAccount[];
  owner: IndividualAccount | null;
}> {
  const allAccountIds = [
    organization.owner_account_id,
    ...organization.admin_account_ids,
    ...(organization.member_account_ids || [])
  ];
  
  const accounts = await fetchAccountsByIds(allAccountIds);
  
  return {
    owner: accounts.find(a => a.account_id === organization.owner_account_id) as IndividualAccount || null,
    admins: accounts.filter(a => organization.admin_account_ids.includes(a.account_id)) as IndividualAccount[],
    members: accounts.filter(a => organization.member_account_ids?.includes(a.account_id)) as IndividualAccount[]
  };
}

export async function fetchRepositories(): Promise<Repository[]> {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: "Repositories"
    }));
    
    const repositories = result.Items || [];
    
    // Collect all account IDs to fetch
    const accountIds = new Set<string>();
    repositories.forEach(repo => {
      if (repo.account_id) {
        accountIds.add(repo.account_id);
      }
    });
    
    // Fetch all accounts in a single batch operation
    const accounts = await fetchAccountsByIds(Array.from(accountIds));
    const accountsMap = new Map<string, Account>();
    accounts.forEach(account => {
      accountsMap.set(account.account_id, account);
    });
    
    // Attach real account data to repositories
    const repositoriesWithAccounts = await Promise.all(
      repositories.map(async repo => {
        if (repo.account_id) {
          const account = accountsMap.get(repo.account_id);
          if (account) {
            repo.account = account;
          } else {
            // If account not found, fetch it individually
            const account = await fetchAccount(repo.account_id);
            if (account) {
              repo.account = account;
            } else {
              // Only create placeholder if account truly doesn't exist
              repo.account = {
                account_id: repo.account_id,
                name: repo.account_id, // Use the account_id as the name instead of a placeholder
                type: 'individual' as const,
                ory_id: '',
                created_at: '',
                updated_at: ''
              } as Account;
            }
          }
        }
        
        return repo as Repository;
      })
    );
    
    return repositoriesWithAccounts;
  } catch (e) {
    console.error("Error fetching repositories:", e);
    return [];
  }
}

export async function fetchRepositoriesByAccountId(account_id: string): Promise<Repository[]> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: "Repositories",
      IndexName: "GSI1",
      KeyConditionExpression: "account_id = :account_id",
      ExpressionAttributeValues: {
        ":account_id": account_id
      }
    }));
    return result.Items as Repository[] || [];
  } catch (e) {
    console.error("Error fetching repositories by account:", e);
    return [];
  }
}

export async function fetchRepository(repository_id: string, account_id: string): Promise<Repository | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: "Repositories",
      Key: { repository_id, account_id }
    }));
    
    if (!result.Item) return null;
    
    // Convert to repository type
    const repository = result.Item as Repository;
    
    // Fetch and add account information
    const account = await fetchAccount(account_id);
    if (account) {
      repository.account = account;
    }
    
    return repository;
  } catch (e) {
    console.error("Error fetching repository:", e);
    return null;
  }
}

export async function updateOrganization(organization: OrganizationalAccount): Promise<void> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: "Accounts",
      Key: { account_id: organization.account_id },
      UpdateExpression: "SET #name = :name, website = :website, contact_email = :contact_email, ror_id = :ror_id, updated_at = :updated_at",
      ExpressionAttributeNames: {
        "#name": "name" // name is a reserved word in DynamoDB
      },
      ExpressionAttributeValues: {
        ":name": organization.name,
        ":website": organization.website || null,
        ":contact_email": organization.contact_email || null,
        ":ror_id": organization.ror_id || null,
        ":updated_at": new Date().toISOString()
      }
    }));
  } catch (e) {
    console.error("Error updating organization:", e);
    throw e;
  }
}

export async function updateAccount(account: Account): Promise<void> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: "Accounts",
      Key: { account_id: account.account_id },
      UpdateExpression: "SET #name = :name, email = :email, updated_at = :updated_at",
      ExpressionAttributeNames: {
        "#name": "name"
      },
      ExpressionAttributeValues: {
        ":name": account.name,
        ":email": account.email || null,
        ":updated_at": new Date().toISOString()
      }
    }));
  } catch (e) {
    console.error("Error updating account:", e);
    throw e;
  }
}

export async function fetchAccountByOryId(ory_id: string): Promise<Account | null> {
  try {
    const command = new QueryCommand({
      TableName: "Accounts",
      IndexName: "OryIdIndex",
      KeyConditionExpression: "ory_id = :ory_id",
      ExpressionAttributeValues: {
        ":ory_id": ory_id
      }
    });

    const result = await docClient.send(command);
    if (result.Items && result.Items.length > 0) {
      return result.Items[0] as Account;
    }
    return null;
  } catch (error) {
    console.error('Error fetching account by Ory ID:', error);
    return null;
  }
}

export async function updateRepository(repository: Repository): Promise<void> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: "Repositories",
      Key: { repository_id: repository.repository_id, account_id: repository.account.account_id },
      UpdateExpression: "SET title = :title, description = :description, private = :private, updated_at = :updated_at",
      ExpressionAttributeValues: {
        ":title": repository.title,
        ":description": repository.description,
        ":private": repository.private,
        ":updated_at": new Date().toISOString()
      }
    }));
  } catch (e) {
    console.error("Error updating repository:", e);
    throw e;
  }
}

export async function fetchAccountsByType(type: string): Promise<Account[]> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: "Accounts",
      IndexName: "GSI1",
      KeyConditionExpression: "#type = :type",
      ExpressionAttributeNames: {
        "#type": "type"
      },
      ExpressionAttributeValues: {
        ":type": type
      }
    }));
    return result.Items as Account[] || [];
  } catch (e) {
    console.error("Error fetching accounts by type:", e);
    return [];
  }
}

export async function fetchAccountByEmail(email: string): Promise<Account | null> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: "Accounts",
      IndexName: "GSI2",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": email
      },
      Limit: 1
    }));

    if (!result.Items || result.Items.length === 0) return null;
    return result.Items[0] as Account;
  } catch (e) {
    console.error("Error fetching account by email:", e);
    return null;
  }
} 