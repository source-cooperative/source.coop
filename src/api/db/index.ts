/**
 * @fileoverview Database operations for the Source Cooperative application.
 *
 * This module provides a set of functions for interacting with DynamoDB tables
 * used in the Source Cooperative application. It includes operations for
 * managing accounts, repositories, API keys, and memberships.
 *
 * The module uses AWS SDK v3 for DynamoDB operations and includes error
 * handling and logging for each database operation.
 *
 * Tables used:
 * - source-cooperative-accounts
 * - source-cooperative-repositories
 * - source-cooperative-api-keys
 * - source-cooperative-memberships
 *
 * @module db
 * @requires @aws-sdk/client-dynamodb
 * @requires @aws-sdk/lib-dynamodb
 * @requires @aws-sdk/util-dynamodb
 * @requires @/api/types
 * @requires @/utils/logger
 *
 * @example
 * import { getAccount, putRepository } from '@/api/db';
 *
 * // Retrieve an account
 * const account = await getAccount('account123');
 *
 * // Add a new repository
 * const newRepo = { account_id: 'account123', repository_id: 'repo1', ... };
 * await putRepository(newRepo);
 */

import {
  Account,
  APIKey,
  Membership,
  Repository,
  RepositoryFeatured,
} from "@/api/types";
import { marshall } from "@aws-sdk/util-dynamodb";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import {
  ScanCommand,
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import logger from "@/utils/logger";

const isProd = process.env.NODE_ENV === "production";

const client = new DynamoDBClient({
  endpoint: isProd ? undefined : "http://localhost:8000/",
});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Retrieves a user account from DynamoDB based on the given identity ID.
 * @param identityId - The identity ID to search for.
 * @returns A Promise that resolves to an Account object if found, or null if not found.
 * @throws Will throw an error if there's an issue querying DynamoDB.
 */
export async function getAccountByIdentityId(
  identityId: string
): Promise<Account | null> {
  const command = new QueryCommand({
    TableName: "source-cooperative-accounts",
    IndexName: "identity_id",
    KeyConditionExpression: "identity_id = :identity_id",
    ExpressionAttributeValues: {
      ":identity_id": identityId,
    },
  });

  try {
    const response = await client.send(command);
    return (response.Items?.[0] as Account) ?? null;
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

/**
 * Retrieves all repositories from DynamoDB.
 * @returns A Promise that resolves to an array of Repository objects.
 * @throws Will throw an error if there's an issue scanning DynamoDB.
 */
export async function getRepositories(): Promise<Repository[]> {
  const command = new ScanCommand({
    TableName: "source-cooperative-repositories",
    ConsistentRead: true,
  });

  try {
    const response = await docClient.send(command);
    return response.Items?.map((item) => item as Repository) ?? [];
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

/**
 * Retrieves a specific repository based on account ID and repository ID.
 * @param accountId - The account ID associated with the repository.
 * @param repositoryId - The ID of the repository to retrieve.
 * @returns A Promise that resolves to a Repository object if found, or null if not found.
 * @throws Will throw an error if there's an issue querying DynamoDB.
 */
export async function getRepository(
  accountId: string,
  repositoryId: string
): Promise<Repository | null> {
  const command = new QueryCommand({
    TableName: "source-cooperative-repositories",
    KeyConditionExpression:
      "account_id = :account_id AND repository_id = :repository_id",
    ExpressionAttributeValues: {
      ":account_id": accountId,
      ":repository_id": repositoryId,
    },
  });

  try {
    const response = await client.send(command);
    return (response.Items?.[0] as Repository) ?? null;
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

/**
 * Retrieves featured repositories from DynamoDB.
 * @returns A Promise that resolves to an array of Repository objects, or null if none found.
 * @throws Will throw an error if there's an issue querying DynamoDB.
 */
export async function getFeaturedRepositories(): Promise<Repository[]> {
  const command = new QueryCommand({
    TableName: "source-cooperative-repositories",
    IndexName: "featured",
    KeyConditionExpression: "featured = :featured",
    ExpressionAttributeValues: {
      ":featured": RepositoryFeatured.Featured,
    },
  });

  try {
    const response = await client.send(command);
    return response.Items?.map((item) => item as Repository) ?? [];
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

/**
 * Retrieves all accounts (user and organization) from DynamoDB.
 * @returns A Promise that resolves to an array of Account objects.
 * @throws Will throw an error if there's an issue scanning DynamoDB.
 */
export async function getAccounts(): Promise<Account[]> {
  const command = new ScanCommand({
    TableName: "source-cooperative-accounts",
    ConsistentRead: true,
  });

  try {
    const response = await docClient.send(command);
    return response.Items?.map((item) => item as Account) ?? [];
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

/**
 * Adds or updates an account in DynamoDB.
 * @param account - The Account object to be added or updated.
 * @returns A Promise that resolves to the added or updated Account object.
 * @throws Will throw an error if there's an issue putting the item in DynamoDB.
 */
export async function putAccount(
  account: Account,
  checkIfExists: boolean = false
): Promise<[Account, boolean]> {
  const command = new PutItemCommand({
    TableName: "source-cooperative-accounts",
    Item: marshall(account),
    ConditionExpression: checkIfExists
      ? "attribute_not_exists(account_id)"
      : undefined,
  });

  try {
    await docClient.send(command);
    return [account, true];
  } catch (e) {
    if (e instanceof Error && e.name === "ConditionalCheckFailedException") {
      return [account, false];
    }
    logger.error(e);
    throw e;
  }
}

/**
 * Adds or updates a repository in DynamoDB.
 * @param repository - The Repository object to be added or updated.
 * @returns A Promise that resolves to the added or updated Repository object.
 * @throws Will throw an error if there's an issue putting the item in DynamoDB.
 */
export async function putRepository(
  repository: Repository
): Promise<Repository> {
  const command = new PutItemCommand({
    TableName: "source-cooperative-repositories",
    Item: marshall(repository),
  });

  try {
    await docClient.send(command);
    return repository;
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

/**
 * Adds or updates an API key in DynamoDB.
 * @param apiKey - The APIKey object to be added or updated.
 * @returns A Promise that resolves to the added or updated APIKey object.
 * @throws Will throw an error if there's an issue putting the item in DynamoDB.
 */
export async function putAPIKey(
  apiKey: APIKey,
  checkIfExists: boolean = false
): Promise<[APIKey, boolean]> {
  const command = new PutItemCommand({
    TableName: "source-cooperative-api-keys",
    Item: marshall(apiKey),
    ConditionExpression: checkIfExists
      ? "attribute_not_exists(access_key_id)"
      : undefined,
  });

  try {
    await docClient.send(command);
    return [apiKey, true];
  } catch (e) {
    if (e instanceof Error && e.name === "ConditionalCheckFailedException") {
      return [apiKey, false];
    }
    logger.error(e);
    throw e;
  }
}

/**
 * Retrieves an API key from DynamoDB based on the access key ID.
 * @param accessKeyId - The access key ID to search for.
 * @returns A Promise that resolves to an APIKey object if found, or null if not found.
 * @throws Will throw an error if there's an issue querying DynamoDB.
 */
export async function getAPIKey(accessKeyId: string): Promise<APIKey | null> {
  const command = new QueryCommand({
    TableName: "source-cooperative-api-keys",
    KeyConditionExpression: "access_key_id = :access_key_id",
    ExpressionAttributeValues: {
      ":access_key_id": accessKeyId,
    },
  });

  try {
    const response = await client.send(command);
    return (response.Items?.[0] as APIKey) ?? null;
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

/**
 * Retrieves an account from DynamoDB based on the account ID.
 * @param accountId - The account ID to search for.
 * @returns A Promise that resolves to an Account object if found, or null if not found.
 * @throws Will throw an error if there's an issue querying DynamoDB.
 */
export async function getAccount(accountId: string): Promise<Account | null> {
  const command = new QueryCommand({
    TableName: "source-cooperative-accounts",
    KeyConditionExpression: "account_id = :account_id",
    ExpressionAttributeValues: {
      ":account_id": accountId,
    },
  });

  try {
    const response = await client.send(command);
    return (response.Items?.[0] as Account) ?? null;
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

/**
 * Retrieves memberships for a user from DynamoDB.
 * @param accountId - The account ID of the user.
 * @returns A Promise that resolves to an array of Membership objects, or null if none found.
 * @throws Will throw an error if there's an issue querying DynamoDB.
 */
export async function getMembershipsForUser(
  accountId: string
): Promise<Membership[]> {
  const command = new QueryCommand({
    TableName: "source-cooperative-memberships",
    IndexName: "account_id",
    KeyConditionExpression: "account_id = :account_id",
    ExpressionAttributeValues: {
      ":account_id": accountId,
    },
  });

  try {
    const response = await client.send(command);
    return response.Items?.map((item) => item as Membership) ?? [];
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

/**
 * Retrieves memberships for an account from DynamoDB.
 * @param membershipAccountId - The account ID to search for memberships.
 * @returns A Promise that resolves to an array of Membership objects, or null if none found.
 * @throws Will throw an error if there's an issue querying DynamoDB.
 */
export async function getMemberships(
  membershipAccountId: string,
  repositoryId: string | null = null
): Promise<Membership[]> {
  const command = new QueryCommand({
    TableName: "source-cooperative-memberships",
    IndexName: "membership_account_id",
    KeyConditionExpression: repositoryId
      ? "membership_account_id = :membership_account_id AND repository_id = :repository_id"
      : "membership_account_id = :membership_account_id",
    ExpressionAttributeValues: {
      ":membership_account_id": membershipAccountId,
      ...(repositoryId && { ":repository_id": repositoryId }),
    },
  });

  try {
    const response = await client.send(command);
    return response.Items?.map((item) => item as Membership) ?? [];
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

/**
 * Retrieves memberships for an account from DynamoDB.
 * @param membershipAccountId - The account ID to search for memberships.
 * @returns A Promise that resolves to an array of Membership objects, or null if none found.
 * @throws Will throw an error if there's an issue querying DynamoDB.
 */
export async function getMembership(
  membershipId: string
): Promise<Membership | null> {
  const command = new QueryCommand({
    TableName: "source-cooperative-memberships",
    KeyConditionExpression: "membership_id = :membership_id",
    ExpressionAttributeValues: {
      ":membership_id": membershipId,
    },
  });

  try {
    const response = await client.send(command);
    return (response.Items?.[0] as Membership) ?? null;
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

/**
 * Retrieves all API keys for an account from DynamoDB.
 * @param accountId - The account ID to search for API keys.
 * @returns A Promise that resolves to an array of APIKey objects, or null if none found.
 * @throws Will throw an error if there's an issue querying DynamoDB.
 */
export async function getAPIKeys(
  accountId: string,
  repositoryId: string | null = null
): Promise<APIKey[]> {
  const command = new QueryCommand({
    TableName: "source-cooperative-api-keys",
    IndexName: "account_id",
    KeyConditionExpression: repositoryId
      ? "account_id = :account_id AND repository_id = :repository_id"
      : "account_id = :account_id",
    ExpressionAttributeValues: {
      ":account_id": accountId,
      ...(repositoryId && { ":repository_id": repositoryId }),
    },
  });

  try {
    const response = await client.send(command);
    return response.Items?.map((item) => item as APIKey) ?? [];
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

/**
 * Adds or updates a membership in DynamoDB.
 * @param membership - The Membership object to be added or updated.
 * @returns A Promise that resolves to the added or updated Membership object.
 * @throws Will throw an error if there's an issue putting the item in DynamoDB.
 */
export async function putMembership(
  membership: Membership,
  checkIfExists: boolean = false
): Promise<[Membership, boolean]> {
  const command = new PutItemCommand({
    TableName: "source-cooperative-memberships",
    Item: marshall(membership),
    ConditionExpression: checkIfExists
      ? "attribute_not_exists(membership_id)"
      : undefined,
  });

  try {
    await docClient.send(command);
    return [membership, true];
  } catch (e) {
    if (e instanceof Error && e.name === "ConditionalCheckFailedException") {
      logger.error(e);
      return [membership, false];
    }
    logger.error(e);
    throw e;
  }
}
