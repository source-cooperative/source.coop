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

import { Account, AccountFlags, Actions, UserSession } from "@/api/types";
import {
  getAccountByIdentityId,
  getAPIKey,
  getAccount,
  getMembershipsForUser,
} from "@/api/db";
import type { NextApiRequest } from "next";
import { isAuthorized } from "@/api/authz";
import logger from "@/utils/logger";
import * as crypto from "crypto";

export function generateAccessKeyID(): string {
  const prefix = "SC";
  const length = 22;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";

  // Generate cryptographically strong random values
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    // Use modulo to map the random byte to an index in the chars string
    const randomIndex = randomBytes[i] % chars.length;
    result += chars[randomIndex];
  }

  return prefix + result;
}

export function generateSecretAccessKey(): string {
  const length = 64;
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  // Generate cryptographically strong random values
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    // Use modulo to map the random byte to an index in the chars string
    const randomIndex = randomBytes[i] % chars.length;
    result += chars[randomIndex];
  }

  return result;
}

/**
 * Authenticates a user using API key credentials.
 *
 * @param accessKeyId - The access key ID for API authentication.
 * @param secretAccessKey - The secret access key for API authentication.
 * @returns A Promise that resolves to a UserSession object if authentication is successful, or null if it fails.
 */
async function authenticateWithApiKey(
  accessKeyId: string,
  secretAccessKey: string
): Promise<UserSession | null> {
  // Retrieve the API key from the database
  const apiKey = await getAPIKey(accessKeyId);

  // Check if the API key is valid, matches the secret, and is not disabled
  if (
    !apiKey ||
    apiKey.secret_access_key !== secretAccessKey ||
    apiKey.disabled
  ) {
    return null;
  }

  // Fetch the account associated with the API key
  const account = (await getAccount(apiKey.account_id)) as Account;
  if (account.disabled) {
    return null;
  }

  // Retrieve and filter memberships for the user
  const memberships = await getMembershipsForUser(account.account_id);
  const filteredMemberships = memberships.filter((membership) =>
    isAuthorized({ account }, membership, Actions.GetMembership)
  );

  // Return the user session
  return {
    account,
    memberships: filteredMemberships,
  };
}

/**
 * Authenticates a user using cookie-based authentication.
 *
 * @param cookieHeader - The cookie header from the request.
 * @returns A Promise that resolves to a UserSession object if authentication is successful, or null if it fails.
 * @throws Will throw an error if there's an issue fetching the session from Ory.
 */
async function authenticateWithCookie(
  cookieHeader: string | undefined
): Promise<UserSession | null> {
  if (!cookieHeader) {
    return null;
  }

  // Make a request to Ory to validate the session
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_ORY_SDK_URL}/sessions/whoami`,
    {
      method: "GET",
      headers: { Cookie: cookieHeader },
    }
  );

  // Handle response errors
  if (!response.ok) {
    if (response.status === 401) {
      return null; // Unauthorized
    }
    const errorText = await response.text();
    throw new Error(
      `Error fetching session from Ory: [${response.status}] ${errorText}`
    );
  }

  // Parse the session data
  const session = await response.json();
  const identityId = session.identity.id;

  // Fetch account information for the user
  const account = await getAccountByIdentityId(identityId);

  if (!account || account.disabled) {
    return { identity_id: identityId };
  }

  // Retrieve and filter memberships for the user
  const memberships = await getMembershipsForUser(account.account_id);
  const filteredMemberships = memberships.filter((membership) =>
    isAuthorized({ account }, membership, Actions.GetMembership)
  );

  // Return the user session
  return {
    identity_id: identityId,
    account,
    memberships: filteredMemberships,
  };
}

/**
 * Retrieves the current user session from the request context.
 * Attempts API key authentication first, then falls back to cookie-based authentication.
 *
 * @param req - The Next.js API request object.
 * @returns A Promise that resolves to a UserSession object if a valid session exists, or null if not authenticated.
 */
export async function getSession(
  req: NextApiRequest
): Promise<UserSession | null> {
  const { authorization } = req.headers;

  // Try API key authentication first
  if (authorization) {
    const [access_key_id, secret_access_key] = authorization.split(" ");
    if (access_key_id && secret_access_key) {
      const apiKeySession = await authenticateWithApiKey(
        access_key_id,
        secret_access_key
      );
      if (apiKeySession) {
        return apiKeySession;
      }
    }
  }

  // Fall back to cookie-based authentication
  return authenticateWithCookie(req.headers.cookie);
}

/**
 * Checks if the given user session belongs to an admin user.
 * @param session - The user session object.
 * @returns A boolean indicating whether the user is an admin.
 */
export function isAdmin(session?: UserSession | null): boolean {
  if (session?.account?.flags) {
    return session?.account?.flags.includes(AccountFlags.ADMIN);
  } else {
    return false;
  }
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
 * // Returns: 'https://www.gravatar.com/avatar/[MD5 hash of email]'
 */
export function getProfileImage(email: string): string {
  if (!email) {
    email = "default@default.com";
  }
  // Trim and lowercase the email
  const trimmedEmail = email.trim().toLowerCase();

  // Create an MD5 hash of the email
  const hash = crypto.createHash("md5").update(trimmedEmail).digest("hex");

  // Construct and return the Gravatar URL
  return `https://www.gravatar.com/avatar/${hash}`;
}
