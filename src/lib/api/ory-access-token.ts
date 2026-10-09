import {
  createRemoteJWKSet,
  decodeJwt,
  jwtVerify,
  type JWTPayload,
} from "jose";
import { CONFIG } from "@/lib/config";
import { accountsTable } from "@/lib/clients/database";
import { UserSession } from "@/types";
import { LOGGER } from "@/lib/logging";
import { sessionForAccount } from "./oidc";

/**
 * Ory access tokens: what `source-coop login` sends to the API, issued by
 * Ory's OAuth2 server for the API's own origin as audience. Ory signs them as
 * JWTs (the client's access token strategy is `jwt`), so they verify against
 * Ory's published keys with no call to Ory per request.
 *
 * The audience is what makes this safe. Ory issues ID tokens to a client ID,
 * and access tokens to whatever audience the client was allowed and asked for,
 * so only a token minted for this API passes, and which clients may mint one
 * is decided in Ory, by the audiences each client is allowed.
 */

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/** @internal Exposed for testing — override to supply a local JWKS resolver. */
export function _setOryJwks(fn: ReturnType<typeof createRemoteJWKSet> | null) {
  if (!CONFIG.environment.isTest) {
    throw new Error("_setOryJwks is only available in test mode");
  }
  jwks = fn;
}

/**
 * The issuers an Ory token may name: the configured one with and without a
 * trailing slash, since Ory's issuer URL may carry one depending on how the
 * project's domain is set up, and `iss` must match it exactly.
 */
export function oryIssuers(): string[] {
  const issuer = CONFIG.auth?.oauth2?.issuer;
  if (!issuer) return [];
  const bare = issuer.replace(/\/+$/, "");
  return [bare, `${bare}/`];
}

function getJwks() {
  if (!jwks) {
    const [issuer] = oryIssuers();
    if (!issuer) throw new Error("Ory OAuth2 issuer URL is not configured");
    jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  }
  return jwks;
}

/**
 * Whether a bearer token claims to come from Ory, read without verifying it:
 * only to pick which verifier gets it, never to trust it.
 */
export function isOryToken(token: string): boolean {
  try {
    const { iss } = decodeJwt(token);
    return typeof iss === "string" && oryIssuers().includes(iss);
  } catch {
    // Not a JWT; whichever verifier sees it will reject it.
    return false;
  }
}

/**
 * Verifies an Ory access token for `audience` and resolves its subject — the
 * person's Ory identity id — to a session, or returns null.
 */
export async function authenticateWithOryAccessToken(
  token: string,
  audience: string,
): Promise<UserSession | null> {
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, getJwks(), {
      issuer: oryIssuers(),
      audience,
      // Pinned, as for the proxy's tokens, against algorithm confusion.
      algorithms: ["RS256"],
      clockTolerance: 30,
    }));
  } catch (error) {
    const e = error as { code?: string; claim?: string; message?: string };
    LOGGER.warn("Failed to verify Ory access token", {
      operation: "authenticateWithOryAccessToken",
      metadata: {
        error_code: e?.code,
        error_claim: e?.claim,
        error_message: e?.message,
        expected_aud: audience,
      },
    });
    return null;
  }

  const sub = payload.sub;
  if (!sub) {
    LOGGER.warn("Ory access token carries no subject", {
      operation: "authenticateWithOryAccessToken",
    });
    return null;
  }

  // Only people sign in through Ory, so the subject is only ever looked up as
  // a person's identity; a service account authenticates through the proxy.
  const account = await accountsTable.fetchByOryId(sub);
  if (!account) {
    LOGGER.warn("Ory access token verified but no account matches its subject", {
      operation: "authenticateWithOryAccessToken",
      metadata: { sub },
    });
    return null;
  }
  return sessionForAccount(account, sub, "authenticateWithOryAccessToken");
}
