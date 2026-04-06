import { jwtVerify, createRemoteJWKSet } from "jose";
import { CONFIG } from "@/lib/config";
import {
  accountsTable,
  membershipsTable,
  isIndividualAccount,
} from "@/lib/clients/database";
import { isAuthorized } from "@/lib/api/authz";
import { Actions, UserSession } from "@/types";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/** @internal Exposed for testing — override to supply a local JWKS resolver. */
export function _setJwks(fn: ReturnType<typeof createRemoteJWKSet> | null) {
  jwks = fn;
}

function getJwks() {
  if (!jwks) {
    const jwksUrl = new URL(
      "/.well-known/jwks.json",
      CONFIG.oidc.issuerUrl
    );
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
  authorization: string | null
): Promise<UserSession | null> {
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }

  if (!CONFIG.oidc.issuerUrl || !CONFIG.oidc.audience) {
    return null;
  }

  const token = authorization.slice(7);

  let payload;
  try {
    const result = await jwtVerify(token, getJwks(), {
      issuer: CONFIG.oidc.issuerUrl,
      audience: CONFIG.oidc.audience,
      clockTolerance: 30,
    });
    payload = result.payload;
  } catch {
    return null;
  }

  const accountId = payload.sub;
  if (!accountId) {
    return null;
  }

  const account = await accountsTable.fetchById(accountId);
  if (!account || account.disabled || !isIndividualAccount(account)) {
    return null;
  }

  const memberships = await membershipsTable.listByUser(account.account_id);
  const filteredMemberships = memberships.filter((membership) =>
    isAuthorized(
      { account, identity_id: account.identity_id },
      membership,
      Actions.GetMembership
    )
  );

  return {
    identity_id: account.identity_id,
    account,
    memberships: filteredMemberships,
  };
}
