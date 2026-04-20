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
  accountsTable,
  membershipsTable,
  isIndividualAccount,
} from "@/lib/clients/database";
import { isAuthorized } from "@/lib/api/authz";
import { getServerSession } from "@ory/nextjs/app";
import { NextRequest } from "next/server";
import { getOryId } from "../ory";
import md5 from "md5";
import { authenticateWithOidcToken } from "./oidc";
import { LOGGER } from "../logging";

/**
 * Retrieves the current user session from the request context.
 * Attempts OIDC token authentication first, then falls back to cookie-based authentication.
 *
 * @param req - The Next.js API request object.
 * @returns A Promise that resolves to a UserSession object if a valid session exists, or null if not authenticated.
 */
export async function getApiSession(
  req: NextRequest,
): Promise<UserSession | null> {
  const authorization = req.headers.get("Authorization");

  if (authorization) {
    LOGGER.debug("Attempting OIDC token authentication", {
      operation: "getApiSession",
      metadata: { method: "OIDC token" },
    });
    const audience = new URL(req.url).origin;
    const oidcSession = await authenticateWithOidcToken(
      authorization,
      audience,
    );
    if (oidcSession) return oidcSession;
  } else {
    LOGGER.debug(
      "No Authorization header found, falling back to cookie-based authentication",
      {
        operation: "getApiSession",
        metadata: { method: "cookie-based" },
      },
    );
  }

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
      Actions.GetMembership,
    ),
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
    },
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
