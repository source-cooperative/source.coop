import {
  jwtVerify,
  createRemoteJWKSet,
  decodeJwt,
  decodeProtectedHeader,
} from "jose";
import { CONFIG } from "@/lib/config";
import { accountsTable, membershipsTable } from "@/lib/clients/database";
import { isAuthorized } from "@/lib/api/authz";
import { Actions, UserSession } from "@/types";
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
 * Authenticates using a signed JWT from the data proxy's OIDC provider.
 * Validates the token signature, issuer, audience, and expiry, then
 * resolves the subject claim to a UserSession.
 */
export async function authenticateWithOidcToken(
  authorization: string | null,
  audience: string,
): Promise<UserSession | null> {
  if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
    // A missing or non-Bearer Authorization header is an expected, normal input
    // (e.g. legacy clients still sending an API key), not an anomaly — log at
    // debug so it doesn't flood warn-level logs on every such request.
    LOGGER.debug("No Bearer token for OIDC authentication, skipping", {
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
      // Pin the signature algorithm. Without this, a token is accepted for any
      // algorithm the JWKS can satisfy; restricting to RS256 (what the proxy
      // signs with) prevents algorithm-confusion/downgrade attacks.
      algorithms: ["RS256"],
      clockTolerance: 30,
    });
    payload = result.payload;
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
      operation: "authenticateWithOidcToken",
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

  const oryId = payload.sub;
  if (!oryId) {
    LOGGER.warn("OIDC token verified but carries no subject claim", {
      operation: "authenticateWithOidcToken",
    });
    return null;
  }

  // The token subject is the caller's Ory identity id (the data proxy signs
  // tokens with the authenticated principal's Ory id as `sub`), so resolve the
  // account via the identity_id index — NOT fetchById, which keys on the
  // human-readable account_id. Only individual accounts have an Ory identity;
  // org accounts are never the subject of a proxy-issued token.
  const account = await accountsTable.fetchByOryId(oryId);
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

  const identity_id = account.identity_id;

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
