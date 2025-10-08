/**
 * @fileoverview Utility functions for API operations in the Source Cooperative application.
 *
 * This module provides utility functions for handling API requests, user sessions, and generating gravatar URLs. It includes functionality for:
 * - Retrieving and validating user sessions
 * - Checking admin status
 * - Generating gravatar URLs
 *
 * The module interacts with Ory for session management and uses custom database
 * operations for retrieving user and membership information.
 *
 * @module api/utils
 * @requires @/api/types
 * @requires next
 * @requires @/utils/logger
 * @requires zod
 * @requires crypto
 * @requires @/api/authz
 * @requires @/api/db
 *
 * @example
 * import { get_session, isAdmin } from '@/api/utils';
 *
 * // Retrieve user session
 * const session = await get_session(req);
 *
 * // Check if user is an admin
 * const adminStatus = isAdmin(session);
 */

import { Actions, UserSession } from "@/types";
import {
  apiKeysTable,
  accountsTable,
  membershipsTable,
  isIndividualAccount,
} from "@/lib/clients/database";
import { isAuthorized } from "@/lib/api/authz";
import { getServerSession } from "@ory/nextjs/app";
import { NextRequest } from "next/server";
import { getOryId } from "../ory";
import md5 from "md5";
import { CONFIG } from "../config";
import { AccountType } from "@/types/account";
import { AccountFlags } from "@/types/shared";

/**
 * Authenticates using the API secret. Used by the Data Proxy to access the API.
 * @param authorization
 * @returns UserSession object if authentication is successful, or null if it fails.
 */
async function authenticateWithApiSecret(
  authorization: string | null
): Promise<UserSession | null> {
  if (authorization !== CONFIG.apiSecret) {
    return null;
  }
  // Create a mock account for the API Secret session
  return {
    identity_id: "api-secret",
    account: {
      type: AccountType.INDIVIDUAL,
      identity_id: "api-secret",
      name: "api-secret",
      account_id: "api-secret",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      disabled: false,
      flags: [AccountFlags.ADMIN],
      metadata_public: {},
      emails: [],
    },
  };
}

/**
 * Authenticates a user using API key credentials.
 *
 * @param accessKeyId - The access key ID for API authentication.
 * @param secretAccessKey - The secret access key for API authentication.
 * @returns A Promise that resolves to a UserSession object if authentication is successful, or null if it fails.
 */
async function authenticateWithApiKey(
  authorization: string | null
): Promise<UserSession | null> {
  if (!authorization) return null;

  const [accessKeyId, secretAccessKey] = authorization.split(" ");

  // Retrieve the API key from the database
  const apiKey = await apiKeysTable.fetchById(accessKeyId);

  // Check if the API key is valid, matches the secret, and is not disabled
  if (
    !apiKey ||
    apiKey.secret_access_key !== secretAccessKey ||
    apiKey.disabled
  ) {
    return null;
  }

  // Fetch the account associated with the API key
  const account = await accountsTable.fetchById(apiKey.account_id);
  if (!account || account.disabled || !isIndividualAccount(account)) {
    return null;
  }

  // Retrieve and filter memberships for the user
  const memberships = await membershipsTable.listByUser(account.account_id);
  const filteredMemberships = memberships.filter((membership) =>
    isAuthorized(
      { account, identity_id: account.identity_id },
      membership,
      Actions.GetMembership
    )
  );

  // Return the user session
  return {
    identity_id: account.identity_id,
    account,
    memberships: filteredMemberships,
  };
}

/**
 * Retrieves the current user session from the request context.
 * Attempts API secret first, then API key authentication, then falls back to cookie-based authentication.
 *
 * @param req - The Next.js API request object.
 * @returns A Promise that resolves to a UserSession object if a valid session exists, or null if not authenticated.
 */
export async function getApiSession(
  req: NextRequest
): Promise<UserSession | null> {
  const authorization = req.headers.get("Authorization");

  const apiSecretSession = await authenticateWithApiSecret(authorization);
  if (apiSecretSession) return apiSecretSession;

  const apiKeySession = await authenticateWithApiKey(authorization);
  if (apiKeySession) return apiKeySession;

  // Fall back to page session (ie cookie-based authentication)
  return getPageSession();
}

/**
 * Retrieves the current user session for visitor to the page.
 *
 * @returns A Promise that resolves to a UserSession object if a valid session exists, or null if not authenticated.
 */
export async function getPageSession(): Promise<UserSession | null> {
  const orySession = await getServerSession();
  if (!orySession) {
    return null;
  }

  const identity_id = getOryId(orySession);
  if (!identity_id) {
    return null;
  }

  // Fetch account information for the user
  const account = await accountsTable.fetchByOryId(identity_id);

  if (!account || account.disabled || !isIndividualAccount(account)) {
    return { orySession, identity_id };
  }

  // Retrieve and filter memberships for the user
  const memberships = await membershipsTable.listByUser(account.account_id);
  const filteredMemberships = memberships.filter((membership) =>
    isAuthorized(
      { orySession, account, identity_id },
      membership,
      Actions.GetMembership
    )
  );

  // Return the user session
  return {
    identity_id,
    orySession,
    account,
    memberships: filteredMemberships,
  };
}

export async function getEmail(identity_id: string): Promise<string | null> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_ORY_SDK_URL}/admin/identities/${identity_id}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.ORY_ACCESS_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    return null;
  }
  const data = await response.json();

  for (const recover_address of data.recovery_addresses) {
    return recover_address.value;
  }

  return null;
}

/**
 * Generates a Gravatar profile image URL based on the provided email address.
 * If no email is provided, it uses a default email address.
 *
 * @param email - The email address to generate the Gravatar URL for.
 * @returns A string containing the Gravatar URL for the given email.
 *
 * @example
 * const imageUrl = getProfileImage('user@example.com');
 * Returns: 'https://www.gravatar.com/avatar/[MD5 hash of email]'
 */
export function getProfileImage(email: string): string {
  if (!email) {
    email = "default@default.com";
  }
  // Trim and lowercase the email
  const trimmedEmail = email.trim().toLowerCase();

  // Create an MD5 hash of the email
  const hash = md5(trimmedEmail);

  // Construct and return the Gravatar URL
  return `https://www.gravatar.com/avatar/${hash}`;
}
