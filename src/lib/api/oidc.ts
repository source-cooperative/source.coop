import {
  jwtVerify,
  createRemoteJWKSet,
  decodeJwt,
  decodeProtectedHeader,
  type JWTPayload,
} from "jose";
import { CONFIG } from "@/lib/config";
import { accountsTable, membershipsTable } from "@/lib/clients/database";
import { isAuthorized } from "@/lib/api/authz";
import { Actions, isServiceAccount, UserSession } from "@/types";
import { LOGGER } from "../logging";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

// jose `code`s for routine, expected token rejections (bad/expired/wrong-claim/
// bad-signature tokens). These are logged at `warn`; anything else (e.g. an
// unreachable JWKS endpoint, a misconfigured issuer) is a system failure logged
// at `error` so it can page on-call.
const ROUTINE_VERIFY_CODES = new Set([
  "ERR_JWT_EXPIRED",
  "ERR_JWT_CLAIM_VALIDATION_FAILED",
  "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
  "ERR_JWS_INVALID",
  "ERR_JWT_INVALID",
  "ERR_JOSE_ALG_NOT_ALLOWED",
]);

/** @internal Exposed for testing — override to supply a local JWKS resolver. */
export function _setJwks(fn: ReturnType<typeof createRemoteJWKSet> | null) {
  if (!CONFIG.environment.isTest) {
    throw new Error("_setJwks is only available in test mode");
  }
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
 * The service account `account_id` names, or null. Only a service account
 * answers by id: a person's or organization's handle is never a subject.
 */
async function serviceAccountById(account_id: string) {
  const account = await accountsTable.fetchById(account_id);
  return account && isServiceAccount(account) ? account : null;
}

/**
 * The subject the data proxy signs with when it calls as itself rather than
 * on behalf of an account (ADR-013, amending ADR-005): only the API-key
 * standing lookup accepts it. A URN, so no account id can ever equal it.
 */
export const PROXY_SELF_SUBJECT = "urn:source:data-proxy";

/**
 * Verifies a proxy-signed assertion — signature against the proxy's JWKS,
 * issuer, audience, RS256, expiry — and returns its claims, or null. Says
 * nothing about who the subject is; callers decide what a subject may do.
 */
export async function verifyProxyAssertion(
  authorization: string | null,
  audience: string,
): Promise<JWTPayload | null> {
  if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
    // A missing or non-Bearer Authorization header is an expected, normal input
    // (e.g. legacy clients still sending an API key), not an anomaly — log at
    // debug so it doesn't flood warn-level logs on every such request.
    LOGGER.debug("No Bearer token for OIDC authentication, skipping", {
      operation: "verifyProxyAssertion",
    });
    return null;
  }

  LOGGER.debug("Authenticating with OIDC token", {
    operation: "verifyProxyAssertion",
    metadata: { audience },
  });
  const token = authorization.slice(7);

  try {
    const result = await jwtVerify(token, getJwks(), {
      // We assume that the data proxy is going to be hosting the JWKS
      issuer: CONFIG.storage.endpoint,
      audience,
      // Pin the signature algorithm. Without this, a token is accepted for any
      // algorithm the JWKS can satisfy; restricting to RS256 (what the proxy
      // signs with) prevents algorithm-confusion/downgrade attacks.
      algorithms: ["RS256"],
      clockTolerance: 30,
    });
    return result.payload;
  } catch (error) {
    // `Error` objects serialize to `{}`, hiding the cause. jose attaches a
    // machine-readable `code` (e.g. ERR_JWT_CLAIM_VALIDATION_FAILED,
    // ERR_JWS_SIGNATURE_VERIFICATION_FAILED, ERR_JWT_EXPIRED,
    // ERR_JWKS_NO_MATCHING_KEY) and, for claim failures, the offending `claim`.
    // Decode the token unverified so we can log its actual iss/aud/exp/kid
    // against what we expect — none of which is secret — turning an opaque
    // failure into an actionable one.
    const e = error as {
      name?: string;
      code?: string;
      claim?: string;
      message?: string;
    };
    let tokenClaims: Record<string, unknown> = { decode: "failed" };
    try {
      const claims = decodeJwt(token);
      const header = decodeProtectedHeader(token);
      tokenClaims = {
        token_iss: claims.iss,
        token_aud: claims.aud,
        token_exp: claims.exp,
        token_alg: header.alg,
        token_kid: header.kid,
      };
    } catch {
      // Leave the failure marker.
    }
    const logPayload = {
      operation: "verifyProxyAssertion",
      metadata: {
        error_name: e?.name,
        error_code: e?.code,
        error_claim: e?.claim,
        error_message: e?.message,
        expected_iss: CONFIG.storage.endpoint,
        expected_aud: audience,
        ...tokenClaims,
      },
    };
    // Routine token rejections shouldn't page on-call; reserve error for
    // system failures (unreachable JWKS, misconfigured issuer, etc.).
    if (e?.code && ROUTINE_VERIFY_CODES.has(e.code)) {
      LOGGER.warn("Failed to verify OIDC token", logPayload);
    } else {
      LOGGER.error("Failed to verify OIDC token", logPayload);
    }
    return null;
  }
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
  const payload = await verifyProxyAssertion(authorization, audience);
  if (!payload) return null;

  const oryId = payload.sub;
  if (!oryId) {
    LOGGER.warn("OIDC token verified but carries no subject claim", {
      operation: "authenticateWithOidcToken",
    });
    return null;
  }

  // The proxy calling as itself is not a session anywhere; the one route that
  // takes it checks the subject directly.
  if (oryId === PROXY_SELF_SUBJECT) {
    LOGGER.warn("OIDC token carries the proxy's own subject; no session for it", {
      operation: "authenticateWithOidcToken",
    });
    return null;
  }

  // The token subject is whatever the data proxy authenticated: a person's Ory
  // identity id, or a service account's own id — for an API key it resolved
  // (ADR-013), or a workload the account trusts (ADR-014), which names the
  // account it wants when it exchanges its token. The two namespaces are read
  // together; should a subject ever name both a person and a service account,
  // it is ambiguous and neither is trusted.
  const [person, service] = await Promise.all([
    accountsTable.fetchByOryId(oryId),
    serviceAccountById(oryId),
  ]);
  if (person && service) {
    LOGGER.warn("OIDC token subject names both a person and a service account", {
      operation: "authenticateWithOidcToken",
      metadata: { sub: oryId, person: person.account_id, service: service.account_id },
    });
    return null;
  }
  const account = person ?? service;
  if (!account) {
    // Verified token, but no account is indexed under this Ory id. This is the
    // silent 401 path: the token is valid but the subject doesn't map to an
    // account in this environment's DB.
    LOGGER.warn("OIDC token verified but no account matches its subject", {
      operation: "authenticateWithOidcToken",
      metadata: { sub: oryId },
    });
    return null;
  }
  if (account.disabled) {
    LOGGER.warn("OIDC token subject resolves to a disabled account", {
      operation: "authenticateWithOidcToken",
      metadata: { sub: oryId, account_id: account.account_id },
    });
    return null;
  }

  // A service account has no Ory identity; the session says so with null.
  const identity_id = account.identity_id ?? null;

  const memberships = await membershipsTable.listByUser(account.account_id);
  const filteredMemberships = memberships.filter((membership) =>
    isAuthorized({ account, identity_id }, membership, Actions.GetMembership),
  );

  LOGGER.debug("OIDC authentication resolved a session", {
    operation: "authenticateWithOidcToken",
    metadata: {
      account_id: account.account_id,
      memberships: filteredMemberships.length,
    },
  });

  return {
    identity_id,
    account,
    memberships: filteredMemberships,
  };
}
