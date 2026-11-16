import "server-only";

import { cookies } from "next/headers";
import { getServerSession } from "@ory/nextjs/app";
import type { ProxyCredentials } from "@/lib/actions/proxy-credentials";
import { getOryId } from "@/lib/ory";
import { decryptJson } from "./encrypted-cookie";
import {
  PROXY_CREDS_COOKIE_NAME,
  isFresh,
  type CachedProxyCredentials,
} from "./proxy-credentials-shared";

/**
 * Render-safe read of the user's cached proxy credentials.
 *
 * Reads and decrypts the `sc_proxy_creds` cookie and returns the credentials
 * only if they are present, still fresh, and were minted for the current
 * session's identity. This NEVER mints credentials and NEVER writes a cookie,
 * so it is safe to call during a Server Component render (where cookie
 * mutation throws). Minting/writing happens separately in an action-phase
 * context (see `refreshProxyCredentials`).
 *
 * Returns `undefined` when there is no cookie, the cookie is stale, the
 * cookie cannot be decrypted (tampered / wrong key), or the cookie belongs to
 * a different user than the current session.
 */
export async function readProxyCredentials(): Promise<
  ProxyCredentials | undefined
> {
  const jar = await cookies();
  const token = jar.get(PROXY_CREDS_COOKIE_NAME)?.value;
  if (!token) return undefined;

  const cached = await decryptJson<CachedProxyCredentials>(token);
  if (!cached || !isFresh(cached)) return undefined;

  // Bind the cookie to the user it was minted for: only /logout clears it, so
  // after a user switch that skips /logout (session expiry → another user
  // signs in on the same browser) the previous user's still-fresh credentials
  // would otherwise be served to the new user. The session is resolved only
  // after a usable cookie is found, so anonymous renders (no cookie) don't pay
  // for it — and via getServerSession directly (one Ory whoami call) rather
  // than getPageSession, which would add account + membership DB reads we
  // don't need: the comparison only requires the Ory identity id. Cookies
  // minted before identity binding existed have no identityId and fail the
  // comparison — treated as absent, the gate simply re-mints.
  const orySession = await getServerSession();
  const identityId = orySession ? getOryId(orySession) : null;
  if (!identityId || cached.identityId !== identityId) {
    return undefined;
  }
  return cached;
}
