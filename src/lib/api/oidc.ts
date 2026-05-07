import { jwtVerify, createRemoteJWKSet } from "jose";
import { CONFIG } from "@/lib/config";
import {
  accountsTable,
  membershipsTable,
  isIndividualAccount,
} from "@/lib/clients/database";
import { isAuthorized } from "@/lib/api/authz";
import { Actions, UserSession } from "@/types";
import type { IndividualAccount } from "@/types/account";
import { LOGGER } from "../logging";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/** @internal Exposed for testing — override to supply a local JWKS resolver. */
export function _setJwks(fn: ReturnType<typeof createRemoteJWKSet> | null) {
  jwks = fn;
}

function getJwks() {
  const issuerUrl = CONFIG.storage.endpoint;
  if (!issuerUrl) {
    throw new Error("OIDC issuer URL is not configured");
  }
  if (!jwks) {
    const jwksUrl = new URL("/.well-known/jwks.json", issuerUrl);
    LOGGER.debug("Fetching JWKS for OIDC token verification", {
      operation: "getJwks",
      metadata: { jwksUrl: jwksUrl.toString() },
    });
    jwks = createRemoteJWKSet(jwksUrl);
  }
  return jwks;
}

/**
 * Authenticates using a signed JWT from the data proxy's OIDC provider.
 * Validates the token signature, issuer, audience, and expiry, then
 * resolves the subject claim to a UserSession.
 */
export async function authenticateWithOidcToken(
  authorization: string | null,
  audience: string,
): Promise<UserSession | null> {
  if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
    LOGGER.warn("Invalid Authorization header found for OIDC authentication", {
      operation: "authenticateWithOidcToken",
    });
    return null;
  }

  LOGGER.debug("Authenticating with OIDC token", {
    operation: "authenticateWithOidcToken",
    metadata: { audience },
  });
  const token = authorization.slice(7);

  let payload;
  try {
    const result = await jwtVerify(token, getJwks(), {
      // We assume that the data proxy is going to be hosting the JWKS
      issuer: CONFIG.storage.endpoint,
      audience,
      clockTolerance: 30,
    });
    payload = result.payload;
  } catch (error) {
    LOGGER.error("Failed to verify OIDC token", {
      operation: "authenticateWithOidcToken",
      metadata: { error },
    });
    return null;
  }

  const oryId = payload.sub;
  if (!oryId) {
    return null;
  }

  const account = await accountsTable.fetchById(oryId);
  if (!account || account.disabled) {
    return null;
  }

  const identity_id = isIndividualAccount(account)
    ? (account as IndividualAccount).identity_id
    : null;

  // Only look up memberships for individual accounts — orgs don't have memberships in other entities
  let filteredMemberships: UserSession["memberships"] = [];
  if (isIndividualAccount(account)) {
    const memberships = await membershipsTable.listByUser(account.account_id);
    filteredMemberships = memberships.filter((membership) =>
      isAuthorized({ account, identity_id }, membership, Actions.GetMembership),
    );
  }

  return {
    identity_id,
    account,
    memberships: filteredMemberships,
  };
}
