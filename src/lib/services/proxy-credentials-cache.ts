"use server";

import { cookies } from "next/headers";
import { getProxyCredentials } from "@/lib/actions/proxy-credentials";
import { getPageSession } from "@/lib/api/utils";
import { withTimeout } from "@/lib/with-timeout";
import { encryptJson, decryptJson } from "./encrypted-cookie";
import {
  PROXY_CREDS_COOKIE_NAME,
  isFresh,
  type CachedProxyCredentials,
} from "./proxy-credentials-shared";

export interface RefreshResult {
  /** Whether the caller is authenticated and credentials are now available. */
  ok: boolean;
}

/**
 * Mints per-user proxy credentials and writes them to the encrypted
 * `sc_proxy_creds` cookie.
 *
 * This is a Server Action: it MUST be invoked from a client component (or
 * other action-phase context), never inline during a Server Component render.
 * In Next.js, cookies are only mutable when `requestStore.phase === 'action'`;
 * calling this during render would throw `ReadonlyRequestCookiesError`. The
 * render path reads the cookie via `readProxyCredentials` instead.
 *
 * Returns early without minting when a fresh cookie already exists. The
 * encrypted cookie is the cache; concurrent mints for the same user just
 * re-mint (idempotent — last write wins), which on serverless can't be
 * coalesced in-process anyway since requests run in separate instances.
 */
export async function refreshProxyCredentials(): Promise<RefreshResult> {
  const session = await getPageSession();
  if (!session?.identity_id) {
    return { ok: false };
  }

  const jar = await cookies();
  const token = jar.get(PROXY_CREDS_COOKIE_NAME)?.value;
  if (token) {
    const cached = await decryptJson<CachedProxyCredentials>(token);
    // Reuse only credentials minted for THIS user. A still-fresh cookie left
    // by a previous user on the same browser (user switch that never hit
    // /logout) must be overwritten, not returned as a cache hit.
    if (
      cached &&
      isFresh(cached) &&
      cached.identityId === session.identity_id
    ) {
      return { ok: true };
    }
  }

  const MINT_TIMEOUT_MS = 25_000;
  const creds = await withTimeout(
    // Pass the session we already resolved so the mint doesn't re-fetch it.
    getProxyCredentials(session.identity_id),
    MINT_TIMEOUT_MS,
    "Credential mint timed out",
  );

  const maxAge = Math.max(
    0,
    Math.floor((new Date(creds.expiration).getTime() - Date.now()) / 1000),
  );
  // Bind the cookie to the identity it was minted for; readers compare this
  // against the current session before using the credentials.
  const payload: CachedProxyCredentials = {
    ...creds,
    identityId: session.identity_id,
  };
  jar.set(PROXY_CREDS_COOKIE_NAME, await encryptJson(payload), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  return { ok: true };
}
