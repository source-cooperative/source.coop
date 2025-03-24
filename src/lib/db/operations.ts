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
  ids: string[],
  typeField?: string,
  defaultType?: string
): Promise<T[]> {
  if (!ids.length) return [];
  
  const uniqueIds = Array.from(new Set(ids));
  const batchSize = 100; // DynamoDB batch limit
  const results: T[] = [];
  
  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    try {
      // Create a BatchGetItem request with support for composite keys
      const batchParams = {
        RequestItems: {
          [tableName]: {
            Keys: batch.map(id => {
              // If typeField is provided, use composite key
              if (typeField && defaultType) {
                return { 
                  [idField]: id,
                  [typeField]: defaultType
                };
              }
              // Otherwise use single key
              return { [idField]: id };
            })
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
  try {
    // Try both individual and organization types
    const types = ['individual', 'organization'];
    
    for (const type of types) {
      const result = await docClient.send(new GetCommand({
        TableName: "Accounts",
        Key: {
          account_id,
          type
        }
      }));
      
      if (result.Item) {
        return result.Item as Account;
      }
    }
    
    return null;
  } catch (e) {
    console.error(`Error fetching account with account_id ${account_id}:`, e);
    return null;
  }
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

  // Remove duplicates while preserving order
  const uniqueIds = Array.from(new Set(account_ids));
  
  try {
    // Run parallel scans for each account ID
    const scanPromises = uniqueIds.map(id => {
      const scanParams = {
        TableName: "Accounts",
        FilterExpression: "account_id = :account_id",
        ExpressionAttributeValues: { 
          ":account_id": id
        }
      };
      
      return docClient.send(new ScanCommand(scanParams));
    });
    
    // Wait for all scans to complete
    const results = await Promise.all(scanPromises);
    
    // Combine and flatten results
    const accounts: Account[] = [];
    for (const result of results) {
      if (result.Items && result.Items.length > 0) {
        accounts.push(...result.Items as Account[]);
      }
    }
    
    return accounts;
  } catch (e) {
    console.error(`Error fetching accounts by IDs:`, e);
    return [];
  }
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
      Limit: limit,
      FilterExpression: "attribute_exists(account_id)" // Only get valid repositories
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
    const accountsMap = new Map(accounts.map(acc => [acc.account_id, acc]));
    
    // Attach account data to repositories with proper type checking
    const repositoriesWithAccounts = repositories.map(repo => {
      const account = accountsMap.get(repo.account_id);
      if (!account) {
        console.warn(`Account not found for repository ${repo.repository_id}`);
        return null;
      }
      
      return {
        ...repo,
        account,
        repository_id: repo.repository_id,
        title: repo.title,
        description: repo.description,
        private: repo.private,
        created_at: repo.created_at,
        updated_at: repo.updated_at
      } as Repository;
    }).filter((repo): repo is Repository => repo !== null);
    
    return {
      repositories: repositoriesWithAccounts,
      lastEvaluatedKey: result.LastEvaluatedKey
    };
  } catch (e) {
    console.error('Error fetching repositories:', e);
    return {
      repositories: [],
      lastEvaluatedKey: null
    };
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
      UpdateExpression: "SET #name = :name, contact_email = :contact_email, ror_id = :ror_id, updated_at = :updated_at",
      ExpressionAttributeNames: {
        "#name": "name" // name is a reserved word in DynamoDB
      },
      ExpressionAttributeValues: {
        ":name": organization.name,
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
    // Validate required fields
    if (!account.account_id || !account.type || !account.name) {
      console.error('Missing required fields for account update:', {
        account_id: account.account_id,
        type: account.type,
        name: account.name
      });
      return false;
    }

    // Type guard for individual accounts
    const isIndividualAccount = (acc: Account): acc is IndividualAccount => 
      acc.type === 'individual';

    // Type guard for organizational accounts
    const isOrganizationalAccount = (acc: Account): acc is OrganizationalAccount => 
      acc.type === 'organization';

    let updateExpression = "SET #name = :name, updated_at = :updated_at";
    const expressionAttributeNames: Record<string, string> = {
      "#name": "name" // name is a reserved word in DynamoDB
    };
    const expressionAttributeValues: Record<string, any> = {
      ":name": account.name,
      ":updated_at": new Date().toISOString()
    };

    // Handle email/contact_email based on account type with type safety
    if (isIndividualAccount(account)) {
      updateExpression += ", email = :email";
      expressionAttributeValues[":email"] = account.email || null;
      
      // Handle ORCID for individual accounts
      if (account.orcid !== undefined) {
        updateExpression += ", orcid = :orcid";
        expressionAttributeValues[":orcid"] = account.orcid || null;
      }
    } else if (isOrganizationalAccount(account)) {
      updateExpression += ", contact_email = :contact_email";
      expressionAttributeValues[":contact_email"] = account.contact_email || null;
      
      // Handle ROR ID for organizational accounts
      if (account.ror_id !== undefined) {
        updateExpression += ", ror_id = :ror_id";
        expressionAttributeValues[":ror_id"] = account.ror_id || null;
      }
    }

    // Handle description
    if (account.description !== undefined) {
      updateExpression += ", description = :description";
      expressionAttributeValues[":description"] = account.description || null;
    }

    // Handle websites
    if (account.websites !== undefined) {
      updateExpression += ", websites = :websites";
      expressionAttributeValues[":websites"] = account.websites || null;
    }

    console.log('Updating account with:', {
      account_id: account.account_id,
      type: account.type,
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    });

    await docClient.send(new UpdateCommand({
      TableName: "Accounts",
      Key: { 
        account_id: account.account_id,
        type: account.type // Include type in the key
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: "attribute_exists(account_id)" // Ensure account exists
    }));
    return true;
  } catch (e) {
    console.error("Error updating account:", {
      error: e,
      account_id: account.account_id,
      type: account.type,
      message: e instanceof Error ? e.message : 'Unknown error'
    });
    return false;
  }
}

export async function fetchAccountByOryId(ory_id: string): Promise<Account | null> {
  try {
    // Use scan with filter as the most reliable approach
    const scanParams = {
      TableName: "Accounts",
      FilterExpression: "ory_id = :ory_id",
      ExpressionAttributeValues: { ":ory_id": ory_id },
      Limit: 1
    };
    
    const result = await docClient.send(new ScanCommand(scanParams));
    
    if (!result.Items || result.Items.length === 0) return null;
    return result.Items[0] as Account;
  } catch (e) {
    console.error(`Error fetching account by ory_id ${ory_id}:`, e);
    return null;
  }
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
  try {
    // Use scan with filter as the most reliable approach
    const scanParams = {
      TableName: "Accounts",
      FilterExpression: "email = :email",
      ExpressionAttributeValues: { ":email": email },
      Limit: 1
    };
    
    const result = await docClient.send(new ScanCommand(scanParams));
    
    if (!result.Items || result.Items.length === 0) return null;
    return result.Items[0] as Account;
  } catch (e) {
    console.error(`Error fetching account by email ${email}:`, e);
    return null;
  }
} 