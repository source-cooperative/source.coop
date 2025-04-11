import { GetCommand, QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Account, IndividualAccount, OrganizationalAccount } from '@/types/account_v2';
import type { Repository_v2 as Repository, RepositoryMirror, RepositoryRole } from '@/types/repository_v2';

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

export async function fetchRepository(account_id: string, repository_id: string): Promise<Repository | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: "sc-repositories",
      Key: {
        repository_id,
        account_id
      }
    }));

    if (!result.Item) return null;

    // Get the account for this repository
    const account = await fetchAccount(account_id);
    
    return {
      ...result.Item as Repository,
      account: account || undefined
    };
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

    // Get the account for these repositories
    const account = await fetchAccount(account_id);

    return (result.Items || []).map(item => ({
      ...item as Repository,
      account: account || undefined
    }));
  } catch (e) {
    console.error(`Error fetching repositories for account ${account_id}:`, e);
    return [];
  }
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
      TableName: "sc-repositories",
      Limit: limit,
      FilterExpression: "attribute_exists(account_id)" // Only get valid repositories
    };
    
    if (lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    const result = await docClient.send(new ScanCommand(scanParams));
    
    // Get all unique account IDs
    const accountIds = new Set((result.Items || []).map(repo => repo.account_id));
    
    // Fetch all accounts in parallel
    const accountPromises = Array.from(accountIds).map(id => fetchAccount(id));
    const accounts = await Promise.all(accountPromises);
    const accountMap = new Map(accounts.filter(Boolean).map(acc => [acc!.account_id, acc]));
    
    // Attach accounts to repositories
    const repositories = (result.Items || []).map(item => ({
      ...item as Repository,
      account: accountMap.get(item.account_id) || undefined
    }));
    
    return {
      repositories,
      lastEvaluatedKey: result.LastEvaluatedKey
    };
  } catch (e) {
    console.error('Error fetching repositories:', e);
    return {
      repositories: [],
      lastEvaluatedKey: undefined
    };
  }
}

export async function fetchPublicRepositories(
  limit = 50,
  lastEvaluatedKey?: any
): Promise<{
  repositories: Repository[];
  lastEvaluatedKey: any;
}> {
  try {
    const queryParams: any = {
      TableName: "sc-repositories",
      IndexName: "PublicRepositoriesIndex",
      KeyConditionExpression: "visibility = :visibility",
      ExpressionAttributeValues: {
        ":visibility": "public"
      },
      Limit: limit
    };

    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const result = await docClient.send(new QueryCommand(queryParams));

    return {
      repositories: (result.Items || []) as Repository[],
      lastEvaluatedKey: result.LastEvaluatedKey
    };
  } catch (e) {
    console.error('Error fetching public repositories:', e);
    return {
      repositories: [],
      lastEvaluatedKey: null
    };
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

export async function updateRepositoryRole(
  repository_id: string,
  account_id: string,
  target_account_id: string,
  role: RepositoryRole
): Promise<boolean> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: "sc-repositories",
      Key: {
        repository_id,
        account_id
      },
      UpdateExpression: "SET metadata.roles.#account = :role",
      ExpressionAttributeNames: {
        "#account": target_account_id
      },
      ExpressionAttributeValues: {
        ":role": role
      }
    }));
    return true;
  } catch (e) {
    console.error(`Error updating role for repository ${repository_id}:`, e);
    return false;
  }
}

export async function updateRepositoryMirror(
  repository_id: string,
  account_id: string,
  mirror_key: string,
  mirror: RepositoryMirror
): Promise<boolean> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: "sc-repositories",
      Key: {
        repository_id,
        account_id
      },
      UpdateExpression: "SET metadata.mirrors.#mirror = :mirror",
      ExpressionAttributeNames: {
        "#mirror": mirror_key
      },
      ExpressionAttributeValues: {
        ":mirror": mirror
      }
    }));
    return true;
  } catch (e) {
    console.error(`Error updating mirror for repository ${repository_id}:`, e);
    return false;
  }
}

/**
 * Fetch members of an organization
 * 
 * @param orgAccount - The organizational account to fetch members for
 * @returns Object containing owner, admins, and members of the organization
 */
export async function fetchOrganizationMembers(orgAccount: OrganizationalAccount): Promise<{
  owner: IndividualAccount | null;
  admins: IndividualAccount[];
  members: IndividualAccount[];
}> {
  try {
    // Extract member IDs from the account's metadata
    const ownerId = orgAccount.metadata_public.owner_account_id;
    const adminIds = orgAccount.metadata_public.admin_account_ids || [];
    const memberIds = orgAccount.metadata_public.member_account_ids || [];
    
    // Fetch the owner account if available
    let owner: IndividualAccount | null = null;
    if (ownerId) {
      const ownerAccount = await fetchAccount(ownerId);
      if (ownerAccount && isIndividualAccount(ownerAccount)) {
        owner = ownerAccount;
      }
    }
    
    // Fetch admin accounts
    const adminPromises = adminIds.map(id => fetchAccount(id));
    const adminAccounts = await Promise.all(adminPromises);
    const admins = adminAccounts.filter((acc): acc is IndividualAccount => 
      acc !== null && isIndividualAccount(acc)
    );
    
    // Fetch member accounts
    const memberPromises = memberIds.map(id => fetchAccount(id));
    const memberAccounts = await Promise.all(memberPromises);
    const members = memberAccounts.filter((acc): acc is IndividualAccount => 
      acc !== null && isIndividualAccount(acc)
    );
    
    return {
      owner,
      admins,
      members
    };
  } catch (e) {
    console.error(`Error fetching organization members for ${orgAccount.account_id}:`, e);
    return {
      owner: null,
      admins: [],
      members: []
    };
  }
}

// Type guards
export const isIndividualAccount = (acc: Account): acc is IndividualAccount => 
  acc.type === 'individual';

export const isOrganizationalAccount = (acc: Account): acc is OrganizationalAccount => 
  acc.type === 'organization'; 