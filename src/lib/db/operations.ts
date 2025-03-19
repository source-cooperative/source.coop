import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import type { Account, IndividualAccount, OrganizationalAccount, Repository } from '@/types';
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  endpoint: "http://localhost:8000",
  region: "local",
  credentials: {
    accessKeyId: "local",
    secretAccessKey: "local"
  }
});

const docClient = DynamoDBDocument.from(client);

export async function fetchAccount(account_id: string): Promise<Account | null> {
  try {
    const result = await docClient.get({
      TableName: "Accounts",
      Key: { account_id }
    });

    if (!result.Item) return null;
    return result.Item as Account;
  } catch (e) {
    console.error("Error fetching account:", e);
    return null;
  }
}

export async function fetchRepositoriesByAccount(account_id: string): Promise<Repository[]> {
  try {
    const result = await docClient.query({
      TableName: "Repositories",
      IndexName: "account_id-index",
      KeyConditionExpression: "account_id = :account_id",
      ExpressionAttributeValues: {
        ":account_id": account_id
      }
    });

    return result.Items as Repository[] || [];
  } catch (e) {
    console.error("Error fetching repositories:", e);
    return [];
  }
}

export async function fetchAccountsByIds(account_ids: string[]): Promise<Account[]> {
  const batchSize = 100; // DynamoDB batch limit
  const results: Account[] = [];

  // Remove duplicates while preserving order
  const uniqueIds = Array.from(new Set(account_ids));

  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    const result = await docClient.batchGet({
      RequestItems: {
        "Accounts": {
          Keys: batch.map(id => ({ account_id: id }))
        }
      }
    });

    if (result.Responses?.Accounts) {
      results.push(...result.Responses.Accounts as Account[]);
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
    const result = await docClient.scan({
      TableName: "Repositories"
    });
    return result.Items as Repository[] || [];
  } catch (e) {
    console.error("Error fetching repositories:", e);
    return [];
  }
}

export async function fetchRepository(account_id: string, repository_id: string): Promise<Repository | null> {
  try {
    const result = await docClient.query({
      TableName: "Repositories",
      IndexName: "account_id-index",
      KeyConditionExpression: "account_id = :account_id",
      FilterExpression: "repository_id = :repository_id",
      ExpressionAttributeValues: {
        ":account_id": account_id,
        ":repository_id": repository_id
      },
      Limit: 1
    });

    if (!result.Items || result.Items.length === 0) return null;
    return result.Items[0] as Repository;
  } catch (e) {
    console.error("Error fetching repository:", e);
    return null;
  }
}

export async function updateOrganization(organization: OrganizationalAccount): Promise<void> {
  try {
    await docClient.update({
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
    });
  } catch (e) {
    console.error("Error updating organization:", e);
    throw e;
  }
}

export async function updateAccount(account_id: string, updates: Partial<Account>): Promise<void> {
  try {
    // Build the update expression and attribute values dynamically
    const updateFields = Object.entries(updates).filter(([_, value]) => value !== undefined);
    
    if (updateFields.length === 0) return;

    const updateExpression = 'SET ' + updateFields.map(([key]) => 
      key === 'name' ? '#name = :name' : `${key} = :${key}`
    ).join(', ') + ', updated_at = :updated_at';

    const expressionAttributeValues = updateFields.reduce((acc, [key, value]) => ({
      ...acc,
      [`:${key}`]: value
    }), {
      ':updated_at': new Date().toISOString()
    });

    const expressionAttributeNames = updateFields.some(([key]) => key === 'name') 
      ? { '#name': 'name' }
      : undefined;

    await docClient.update({
      TableName: "Accounts",
      Key: { account_id },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ...(expressionAttributeNames && { ExpressionAttributeNames: expressionAttributeNames })
    });
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