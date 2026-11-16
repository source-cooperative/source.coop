/**
 * @fileoverview Utility functions for API operations in the Source Cooperative application.
 *
 * This module provides utility functions for handling API requests and user sessions. It includes functionality for:
 * - Retrieving and validating user sessions
 * - Checking admin status
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
import { authenticateWithOidcToken } from "./oidc";
import {
  authenticateWithOryAccessToken,
  isOryToken,
} from "./ory-access-token";
import { CONFIG } from "@/lib/config";
import { LOGGER } from "@/lib/logging";

const READS = new Set(["GET", "HEAD"]);

/**
 * Retrieves the current user session from the request context.
 *
 * A bearer token is either an Ory access token (from `source-coop login`) or
 * an assertion the data proxy signed on a caller's behalf; its issuer says
 * which, and only that verifier sees it. Without an Authorization header, the
 * session cookie is used.
 *
 * @param req - The Next.js API request object.
 * @returns A Promise that resolves to a UserSession object if a valid session exists, or null if not authenticated.
 */
export async function getApiSession(
  req: NextRequest,
): Promise<UserSession | null> {
  const authorization = req.headers.get("Authorization");

  if (authorization) {
    const audience = CONFIG.auth.oauth2.audience || new URL(req.url).origin;
    const token = authorization.toLowerCase().startsWith("bearer ")
      ? authorization.slice(7)
      : "";
    if (isOryToken(token)) {
      return authenticateWithOryAccessToken(token, audience);
    }
    // The data proxy's assertions only read: the proxy can sign any subject,
    // so its key must not be able to change anything as anyone.
    if (!READS.has(req.method)) {
      LOGGER.warn("Refusing a proxy assertion for a write", {
        operation: "getApiSession",
        metadata: { method: req.method },
      });
      return null;
    }
    LOGGER.debug("Attempting proxy assertion authentication", {
      operation: "getApiSession",
      metadata: { method: "proxy assertion" },
    });
    const oidcSession = await authenticateWithOidcToken(
      authorization,
      audience,
    );
    if (oidcSession) return oidcSession;
    // An explicit but invalid Authorization header must not fall back to
    // cookie auth — that would let a bogus Bearer token silently succeed
    // via the session cookie.
    return null;
  }

  LOGGER.debug(
    "No Authorization header found, falling back to cookie-based authentication",
    {
      operation: "getApiSession",
      metadata: { method: "cookie-based" },
    },
  );

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

/**
 * Looks up an Ory identity by email address via the Ory admin API and returns
 * its identity ID, or null if no identity matches.
 *
 * Uses the `credentials_identifier` filter, which matches the identifier a user
 * authenticates with (their email).
 *
 * @param email - The email address to look up.
 * @returns The Ory identity ID, or null if not found.
 */
export async function getOryIdentityIdByEmail(
  email: string
): Promise<string | null> {
  const url = new URL(`${CONFIG.auth.api.backendUrl}/admin/identities`);
  url.searchParams.set("credentials_identifier", email);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${CONFIG.auth.accessToken}`,
    },
  });

  if (!response.ok) {
    LOGGER.warn("Ory identity lookup by email failed", {
      operation: "getOryIdentityIdByEmail",
      context: "ory",
      metadata: { status: response.status },
    });
    return null;
  }

  const identities = await response.json();
  if (!Array.isArray(identities) || identities.length === 0) {
    return null;
  }

  return identities[0]?.id ?? null;
}
