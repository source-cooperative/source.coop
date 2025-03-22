import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument, GetCommand, QueryCommand, BatchGetCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Account, IndividualAccount, OrganizationalAccount, Repository } from '@/types';
import { CONFIG } from '../config';

// Use the singleton client from clients/index.ts
import { getDynamoDb } from '../clients';

const docClient = getDynamoDb();

/**
 * Generic helper to fetch an entity by a field value
 */
async function getEntityByField<T>(
  tableName: string, 
  fieldName: string, 
  fieldValue: string, 
  indexName?: string
): Promise<T | null> {
  try {
    const queryParams: any = {
      TableName: tableName,
      KeyConditionExpression: `${fieldName} = :value`,
      ExpressionAttributeValues: { ":value": fieldValue },
      Limit: 1
    };
    
    if (indexName) {
      queryParams.IndexName = indexName;
    }
        
    const result = await docClient.send(new QueryCommand(queryParams));
    
    if (!result.Items || result.Items.length === 0) return null;
    return result.Items[0] as T;
  } catch (e) {
    console.error(`Error fetching ${tableName} by ${fieldName}:`, e);
    return null;
  }
}

/**
 * Generic helper for batch fetching entities by IDs
 */
async function batchGetEntitiesByIds<T>(
  tableName: string,
  idField: string,
  ids: string[]
): Promise<T[]> {
  if (!ids.length) return [];
  
  const uniqueIds = Array.from(new Set(ids));
  const batchSize = 100; // DynamoDB batch limit
  const results: T[] = [];
  
  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    try {
      // Create a BatchGetItem request
      const batchParams = {
        RequestItems: {
          [tableName]: {
            Keys: batch.map(id => ({ [idField]: id }))
          }
        }
      };
      
      const result = await docClient.send(new BatchGetCommand(batchParams));
      
      if (result.Responses && result.Responses[tableName]) {
        results.push(...result.Responses[tableName] as T[]);
      }
    } catch (e) {
      console.error(`Error batch fetching ${tableName}:`, e);
      // Continue with other batches even if one fails
    }
  }
  
  return results;
}

/**
 * Generic helper to query a collection of entities
 */
async function queryEntities<T>(
  tableName: string,
  keyCondition: string,
  expressionValues: Record<string, any>,
  indexName?: string,
  limit?: number,
  expressionNames?: Record<string, string>
): Promise<T[]> {
  try {
    const queryParams: any = {
      TableName: tableName,
      KeyConditionExpression: keyCondition,
      ExpressionAttributeValues: expressionValues
    };
    
    if (indexName) {
      queryParams.IndexName = indexName;
    }
    
    if (limit) {
      queryParams.Limit = limit;
    }
    
    if (expressionNames) {
      queryParams.ExpressionAttributeNames = expressionNames;
    }
    
    const result = await docClient.send(new QueryCommand(queryParams));
    return (result.Items || []) as T[];
  } catch (e) {
    console.error(`Error querying ${tableName}:`, e);
    return [];
  }
}

export async function fetchAccount(account_id: string): Promise<Account | null> {
  return getEntityByField<Account>("Accounts", "account_id", account_id);
}

export async function fetchRepositoriesByAccount(account_id: string): Promise<Repository[]> {
  return queryEntities<Repository>(
    "Repositories",
    "account_id = :account_id",
    { ":account_id": account_id },
    "GSI1"
  );
}

export async function fetchAccountsByIds(account_ids: string[]): Promise<Account[]> {
  // If no account IDs provided, return empty array
  if (!account_ids.length) {
    return [];
  }

  const batchSize = 25; // Smaller batch for better parallelization
  const results: Account[] = [];

  // Remove duplicates while preserving order
  const uniqueIds = Array.from(new Set(account_ids));

  // Process in smaller batches for better parallelization
  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    try {
      // Query for each account_id in parallel
      const queries = batch.map(id => 
        docClient.send(new QueryCommand({
          TableName: "Accounts",
          KeyConditionExpression: "account_id = :account_id",
          ExpressionAttributeValues: {
            ":account_id": id
          }
        }))
      );

      // Wait for all queries in this batch to complete
      const batchResults = await Promise.all(queries);
      
      // Extract and flatten the results
      const accounts = batchResults
        .map(result => result.Items || [])
        .flat() as Account[];
      
      results.push(...accounts);
    } catch (e) {
      console.error("Error fetching accounts batch:", e);
      // Continue with other batches even if one fails
    }
  }

  return results;
}

export async function fetchOrganizationMembers(organization: OrganizationalAccount): Promise<{
  owner: IndividualAccount | null;
  admins: IndividualAccount[];
  members: IndividualAccount[];
}> {
  // Get all account IDs for this organization
  const allAccountIds = Array.from(new Set([
    organization.owner_account_id,
    ...organization.admin_account_ids,
    ...(organization.member_account_ids || [])
  ]));
  
  const accounts = await fetchAccountsByIds(allAccountIds);
  
  // Get the owner account
  const owner = accounts.find(a => a.account_id === organization.owner_account_id) as IndividualAccount || null;
  
  // Create a Set of accounts that are already handled to prevent duplicates
  const handledAccounts = new Set<string>();
  if (owner) {
    handledAccounts.add(owner.account_id);
  }
  
  // Get admin accounts (excluding the owner)
  const admins = accounts.filter(a => 
    organization.admin_account_ids.includes(a.account_id) && 
    !handledAccounts.has(a.account_id)
  ) as IndividualAccount[];
  
  // Add all admin accounts to the handled set
  admins.forEach(admin => handledAccounts.add(admin.account_id));
  
  // Get member accounts (excluding admins and owner)
  const members = accounts.filter(a => 
    (organization.member_account_ids || []).includes(a.account_id) && 
    !handledAccounts.has(a.account_id)
  ) as IndividualAccount[];
  
  return { owner, admins, members };
}

export async function fetchRepositories(
  limit = 50,
  lastEvaluatedKey?: any
): Promise<{
  repositories: Repository[];
  lastEvaluatedKey: any;
}> {
  try {
    // Use a scan but with pagination to avoid loading everything at once
    const scanParams: any = {
      TableName: "Repositories",
      Limit: limit
    };
    
    if (lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    const result = await docClient.send(new ScanCommand(scanParams));
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
    const repositoriesWithAccounts = repositories.map(repo => {
      if (repo.account_id) {
        const account = accountsMap.get(repo.account_id);
        if (account) {
          repo.account = account;
        } else {
          // Use a basic account placeholder if not found
          repo.account = {
            account_id: repo.account_id,
            name: repo.account_id, // Use the account_id as the name
            type: 'individual' as const,
            ory_id: '',
            created_at: '',
            updated_at: ''
          } as Account;
        }
      }
      return repo as Repository;
    });
    
    return {
      repositories: repositoriesWithAccounts,
      lastEvaluatedKey: result.LastEvaluatedKey
    };
  } catch (e) {
    console.error("Error fetching repositories:", e);
    return { repositories: [], lastEvaluatedKey: null };
  }
}

export async function fetchRepositoriesByAccountId(account_id: string): Promise<Repository[]> {
  return queryEntities<Repository>(
    "Repositories",
    "account_id = :account_id",
    { ":account_id": account_id },
    "GSI1"
  );
}

export async function fetchRepository(repository_id: string, account_id: string): Promise<Repository | null> {
  try {
    // Use GetCommand directly as this uses a primary key lookup
    const result = await docClient.send(new GetCommand({
      TableName: "Repositories",
      Key: { repository_id, account_id }
    }));
    
    if (!result.Item) return null;
    
    // Convert to repository type
    const repository = result.Item as Repository;
    
    // Fetch and add account information
    if (account_id) {
      const account = await fetchAccount(account_id);
      if (account) {
        repository.account = account;
      }
    }
    
    return repository;
  } catch (e) {
    console.error("Error fetching repository:", e);
    return null;
  }
}

export async function updateOrganization(organization: OrganizationalAccount): Promise<boolean> {
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
    return true;
  } catch (e) {
    console.error("Error updating organization:", e);
    return false;
  }
}

export async function updateAccount(account: Account): Promise<boolean> {
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
    return true;
  } catch (e) {
    console.error("Error updating account:", e);
    return false;
  }
}

export async function fetchAccountByOryId(ory_id: string): Promise<Account | null> {
  return getEntityByField<Account>("Accounts", "ory_id", ory_id, "OryIdIndex");
}

export async function updateRepository(repository: Repository): Promise<boolean> {
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
    return true;
  } catch (e) {
    console.error("Error updating repository:", e);
    return false;
  }
}

export async function fetchAccountsByType(type: string): Promise<Account[]> {
  return queryEntities<Account>(
    "Accounts",
    "#type = :type",
    { ":type": type },
    "GSI1",
    undefined,
    { "#type": "type" } // type is a reserved word in DynamoDB
  );
}

export async function fetchAccountByEmail(email: string): Promise<Account | null> {
  return getEntityByField<Account>("Accounts", "email", email, "GSI2");
} 