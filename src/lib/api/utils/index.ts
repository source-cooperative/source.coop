import {
  Account,
  AccountFlags,
  Actions,
  APIKey,
  ErrorResponse,
  Membership,
  Repository,
  UserSession,
} from "@/lib/api/types";
import logger from "@/utils/logger";

import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import {
  ScanCommand,
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { NextApiRequest } from "next";
import { marshall } from "@aws-sdk/util-dynamodb";

import { z } from "zod";
import { isAuthorized } from "../authz";

const client = new DynamoDBClient({ endpoint: "http://localhost:8000/" });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Retrieves a user account from DynamoDB based on the given identity ID.
 * @param identity_id - The identity ID to search for.
 * @returns A Promise that resolves to a UserAccount object if found, or null if not found.
 * @throws Will throw an error if there's an issue querying DynamoDB.
 */
export async function get_account_by_identity_id(
  identity_id: string
): Promise<Account | null> {
  logger.debug("DynamoDB: Command Query on Table source-cooperative-accounts");
  const command = new QueryCommand({
    TableName: "source-cooperative-accounts",
    IndexName: "identity_id",
    KeyConditionExpression: "identity_id = :identity_id",
    ExpressionAttributeValues: {
      ":identity_id": identity_id,
    },
  });

  try {
    const response = await client.send(command);
    logger.debug(
      "DynamoDB: Command Query on Table source-cooperative-accounts completed successfully"
    );
    if (response.Items && response.Items.length > 0) {
      return response.Items[0] as Account;
    }

    return null;
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

/**
 * Retrieves all repositories from DynamoDB.
 * @returns A Promise that resolves to an array of Repository objects.
 * @remarks This function filters out disabled repositories.
 */
export async function get_repositories(): Promise<Repository[]> {
  logger.debug(
    "DynamoDB: Command Scan on Table source-cooperative-repositories"
  );
  const command = new ScanCommand({
    TableName: "source-cooperative-repositories",
    ConsistentRead: true,
  });

  try {
    const response = await docClient.send(command);
    logger.debug(
      "DynamoDB: Command Scan on Table source-cooperative-repositories completed successfully"
    );
    return response.Items.map((item) => item as Repository);
  } catch (e) {
    logger.error(e);
    throw e;
  }
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
  logger.debug(
    "DynamoDB: Command Query on Table source-cooperative-repositories"
  );
  const command = new QueryCommand({
    TableName: "source-cooperative-repositories",
    KeyConditionExpression:
      "account_id = :account_id AND repository_id = :repository_id",
    ExpressionAttributeValues: {
      ":account_id": account_id,
      ":repository_id": repository_id,
    },
  });

  try {
    const response = await client.send(command);
    logger.debug(
      "DynamoDB: Command Query on Table source-cooperative-repositories completed successfully"
    );

    if (response.Items && response.Items.length > 0) {
      return response.Items[0] as Repository;
    }

    return null;
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

/**
 * Retrieves all accounts (user and organization) from DynamoDB.
 * @returns A Promise that resolves to an array of UserAccount or OrganizationAccount objects.
 * @remarks This function filters out disabled accounts.
 */
export async function get_accounts(): Promise<Account[]> {
  logger.debug("DynamoDB: Command Scan on Table source-cooperative-accounts");
  const command = new ScanCommand({
    TableName: "source-cooperative-accounts",
    ConsistentRead: true,
  });

  try {
    const response = await docClient.send(command);
    logger.debug(
      "DynamoDB: Command Scan on Table source-cooperative-accounts completed successfully"
    );
    return response.Items.map((item) => item as Account);
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function put_account(account: Account): Promise<Account> {
  logger.debug(
    "DynamoDB: Command PutItem on Table source-cooperative-accounts"
  );

  const command = new PutItemCommand({
    TableName: "source-cooperative-accounts",
    Item: marshall(account),
  });

  try {
    await docClient.send(command);
    logger.debug(
      "DynamoDB: Command PutItem on Table source-cooperative-accounts completed successfully"
    );
    return account;
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function put_repository(
  repository: Repository
): Promise<Repository> {
  logger.debug(
    "DynamoDB: Command PutItem on Table source-cooperative-repositories"
  );

  const command = new PutItemCommand({
    TableName: "source-cooperative-repositories",
    Item: marshall(repository),
  });

  try {
    await docClient.send(command);
    logger.debug(
      "DynamoDB: Command PutItem on Table source-cooperative-repositories completed successfully"
    );
    return repository;
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function put_api_key(api_key: APIKey): Promise<APIKey> {
  logger.debug(
    "DynamoDB: Command PutItem on Table source-cooperative-api-keys"
  );

  const command = new PutItemCommand({
    TableName: "source-cooperative-api-keys",
    Item: marshall(api_key),
  });

  try {
    await docClient.send(command);
    logger.debug(
      "DynamoDB: Command PutItem on Table source-cooperative-api-keys completed successfully"
    );
    return api_key;
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function get_api_key(
  access_key_id: string
): Promise<APIKey | null> {
  logger.debug("DynamoDB: Command Query on Table source-cooperative-api-keys");
  const command = new QueryCommand({
    TableName: "source-cooperative-api-keys",
    KeyConditionExpression: "access_key_id = :access_key_id",
    ExpressionAttributeValues: {
      ":access_key_id": access_key_id,
    },
  });

  try {
    const response = await client.send(command);
    logger.debug(
      "DynamoDB: Command Query on Table source-cooperative-accounts completed successfully"
    );

    if (response.Items && response.Items.length > 0) {
      return response.Items[0] as APIKey;
    }

    return null;
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function get_account(account_id: string): Promise<Account | null> {
  logger.debug("DynamoDB: Command Query on Table source-cooperative-accounts");
  const command = new QueryCommand({
    TableName: "source-cooperative-accounts",
    KeyConditionExpression: "account_id = :account_id",
    ExpressionAttributeValues: {
      ":account_id": account_id,
    },
  });

  try {
    const response = await client.send(command);
    logger.debug(
      "DynamoDB: Command Query on Table source-cooperative-accounts completed successfully"
    );

    if (response.Items && response.Items.length > 0) {
      return response.Items[0] as Account;
    }

    return null;
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function get_memberships_for_user(
  account_id: string
): Promise<Membership[] | null> {
  logger.debug(
    "DynamoDB: Command Query on Table source-cooperative-memberships"
  );
  const command = new QueryCommand({
    TableName: "source-cooperative-memberships",
    KeyConditionExpression: "account_id = :account_id",
    ExpressionAttributeValues: {
      ":account_id": account_id,
    },
  });

  try {
    const response = await client.send(command);
    logger.debug(
      "DynamoDB: Command Query on Table source-cooperative-memberships completed successfully"
    );

    return response.Items.map((item) => item as Membership);
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function get_memberships(
  membership_account_id: string
): Promise<Membership[] | null> {
  logger.debug(
    "DynamoDB: Command Query on Table source-cooperative-memberships"
  );
  const command = new QueryCommand({
    TableName: "source-cooperative-memberships",
    IndexName: "membership_account_id",
    KeyConditionExpression: "membership_account_id = :membership_account_id",
    ExpressionAttributeValues: {
      ":membership_account_id": membership_account_id,
    },
  });

  try {
    const response = await client.send(command);
    logger.debug(
      "DynamoDB: Command Query on Table source-cooperative-memberships completed successfully"
    );

    return response.Items.map((item) => item as Membership);
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function get_api_keys(
  account_id: string
): Promise<APIKey[] | null> {
  logger.debug("DynamoDB: Command Query on Table source-cooperative-api-keys");
  const command = new QueryCommand({
    TableName: "source-cooperative-api-keys",
    IndexName: "account_id",
    KeyConditionExpression: "account_id = :account_id",
    ExpressionAttributeValues: {
      ":account_id": account_id,
    },
  });

  try {
    const response = await client.send(command);
    logger.debug(
      "DynamoDB: Command Query on Table source-cooperative-api-keys completed successfully"
    );

    return response.Items.map((item) => item as APIKey);
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function put_membership(
  membership: Membership
): Promise<Membership> {
  logger.debug(
    "DynamoDB: Command PutItem on Table source-cooperative-memberships"
  );

  const command = new PutItemCommand({
    TableName: "source-cooperative-memberships",
    Item: marshall(membership),
  });

  try {
    await docClient.send(command);
    logger.debug(
      "DynamoDB: Command PutItem on Table source-cooperative-memberships completed successfully"
    );
    return membership;
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

/**
 * Retrieves the current user session from the request context.
 * @param req - The Next.js API request object.
 * @returns A Promise that resolves to a UserSession object if a valid session exists, or null if not authenticated.
 * @throws Will throw an error if there's an issue fetching the session from Ory.
 */
export async function get_session(
  req: NextApiRequest
): Promise<UserSession | null> {
  // Try to look up the user by the access token first
  const { access_key_id, secret_access_key } = req.query;
  try {
    if (access_key_id && secret_access_key) {
      const api_key = await get_api_key(access_key_id as string);
      if (
        api_key &&
        api_key.secret_access_key === secret_access_key &&
        api_key.disabled === false
      ) {
        const account = (await get_account(api_key.account_id)) as Account;
        var memberships = await get_memberships_for_user(account.account_id);

        memberships = memberships.filter((membership) => {
          isAuthorized({ account }, membership, Actions.GET_MEMBERSHIP);
        });

        if (!account.disabled) {
          return {
            account: account,
            memberships: memberships,
          };
        }
      }
    }

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
    logger.debug(cookieHeader);
    logger.debug(response.status);

    if (!response.ok) {
      if (response.status === 401) {
        return;
      }
      const errorText = await response.text();
      throw new Error(
        `Error fetching session from Ory: [${response.status}] ${errorText}`
      );
    }

    const session = await response.json();

    var user_session: UserSession = {
      identity_id: session.identity.id,
    };

    user_session.account = await get_account_by_identity_id(
      user_session.identity_id
    );
    if (user_session.account) {
      var memberships = await get_memberships_for_user(
        user_session.account.account_id
      );

      user_session.memberships = memberships.filter((membership) => {
        isAuthorized(user_session, membership, Actions.GET_MEMBERSHIP);
      });
    }

    if (user_session.account?.disabled) {
      return;
    }
    logger.debug(user_session);
    return user_session;
  } catch (e) {
    logger.error(e);
    logger.error("Throwing error");
    throw e;
  }
}

export function isAdmin(session?: UserSession): boolean {
  if (session?.account?.flags) {
    return session?.account?.flags.includes(AccountFlags.ADMIN);
  } else {
    return false;
  }
}

export function parse_request_body(req: NextApiRequest, schema: z.ZodSchema) {
  // Check if the request body is JSON
  if (typeof req.body !== "object") {
    const error: ErrorResponse = {
      code: 400,
      message:
        "Invalid request body, expecting JSON (maybe check your Content-Type header?)",
    };

    return { result: null, error };
  }

  // Validate the request body
  const result = schema.safeParse(req.body);
  if (result.success) {
    return { result: result.data, error: null };
  }

  // Return an error if the request body is invalid
  return {
    result: null,
    error: {
      code: 400,
      message: {
        error: "Invalid request body",
        issues: result.error.issues,
      },
    },
  };
}
