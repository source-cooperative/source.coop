import {
  AccountType,
  OrganizationAccount,
  Repository,
  UserAccount,
  UserSession,
} from "@/lib/api/types";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  ScanCommand,
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import type { NextApiRequest } from "next";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Retrieves a user account from DynamoDB based on the given identity ID.
 * @param identity_id - The identity ID to search for.
 * @returns A Promise that resolves to a UserAccount object if found, or null if not found.
 * @throws Will throw an error if there's an issue querying DynamoDB.
 */
export async function get_account_by_identity_id(
  identity_id: string
): Promise<UserAccount | null> {
  const params: QueryCommandInput = {
    TableName: "source-cooperative-accounts",
    IndexName: "identity_id",
    KeyConditionExpression: "identity_id = :id",
    ExpressionAttributeValues: {
      ":id": identity_id,
    },
  };

  try {
    const command = new QueryCommand(params);
    const response = await client.send(command);

    if (response.Items && response.Items.length > 0) {
      return response.Items[0] as UserAccount;
    }

    return null;
  } catch (error) {
    console.error("Error querying DynamoDB:", error);
    throw error;
  }
}

/**
 * Retrieves all repositories from DynamoDB.
 * @returns A Promise that resolves to an array of Repository objects.
 * @remarks This function filters out disabled repositories.
 */
export async function get_repositories(): Promise<Repository[]> {
  const command = new ScanCommand({
    TableName: "source-cooperative-repositories",
    ConsistentRead: true,
  });

  const response = await docClient.send(command);

  var repositories: Repository[] = response.Items.map(
    (item) => item as Repository
  );

  // If the user is not an admin, filter out disabled repositories
  repositories = repositories.filter(
    (repository) => repository.disabled === false
  );

  return repositories;
}

/**
 * Retrieves a specific repository based on account ID and repository ID.
 * @param account_id - The account ID associated with the repository.
 * @param repository_id - The ID of the repository to retrieve.
 * @returns A Promise that resolves to a Repository object if found, or null if not found.
 */
export async function get_repository(
  account_id: string,
  repository_id: string
): Promise<Repository | null> {
  const repositories = await get_repositories();

  for (var repository of repositories) {
    if (
      repository.account_id === account_id ||
      repository.repository_id === repository_id
    ) {
      return repository;
    }
  }

  return null;
}

/**
 * Retrieves all accounts (user and organization) from DynamoDB.
 * @returns A Promise that resolves to an array of UserAccount or OrganizationAccount objects.
 * @remarks This function filters out disabled accounts.
 */
export async function get_accounts(): Promise<
  (UserAccount | OrganizationAccount)[]
> {
  const command = new ScanCommand({
    TableName: "source-cooperative-accounts",
    ConsistentRead: true,
  });

  const response = await docClient.send(command);

  var account_list: (UserAccount | OrganizationAccount)[] = response.Items.map(
    (item) => item as UserAccount | OrganizationAccount
  );

  // If the user is not an admin, filter out disabled accounts
  account_list = account_list.filter((account) => account.disabled === false);

  return account_list;
}

/**
 * Retrieves a specific account based on the account ID.
 * @param account_id - The ID of the account to retrieve.
 * @returns A Promise that resolves to a UserAccount or OrganizationAccount object if found, or null if not found.
 */
export async function get_account(
  account_id: string
): Promise<UserAccount | OrganizationAccount | null> {
  const accounts = await get_accounts();
  for (var account of accounts) {
    if (account.account_id === account_id) {
      return account;
    }
  }

  return null;
}

/**
 * Retrieves the current user session from the Ory API.
 * @param req - The Next.js API request object.
 * @returns A Promise that resolves to a UserSession object if a valid session exists, or null if not authenticated.
 * @throws Will throw an error if there's an issue fetching the session from Ory.
 */
export async function get_session(
  req: NextApiRequest
): Promise<UserSession | null> {
  const cookieHeader = req.headers.cookie;

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/.ory/sessions/whoami`,
    {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }
    const errorText = await response.text();
    throw new Error(
      `Error fetching session from Ory: [${response.status}] ${errorText}`
    );
  }

  const session = await response.json();

  var user_session: UserSession = {
    identity_id: session.identity.id,
    flags: session.identity.metadata_public.flags,
    profile: session.identity.traits,
  };

  user_session.account = await get_account_by_identity_id(
    user_session.identity_id
  );

  if (user_session.account?.disabled) {
    return null;
  }

  return user_session;
}
