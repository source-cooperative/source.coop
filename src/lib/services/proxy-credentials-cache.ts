"use server";

import { cookies } from "next/headers";
import {
  getProxyCredentials,
  type ProxyCredentials,
} from "@/lib/actions/proxy-credentials";
import { getPageSession } from "@/lib/api/utils";
import { withTimeout } from "@/lib/with-timeout";
import { encryptJson, decryptJson } from "./encrypted-cookie";
import {
  PROXY_CREDS_COOKIE_NAME,
  isFresh,
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
    const cached = await decryptJson<ProxyCredentials>(token);
    if (cached && isFresh(cached)) {
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
  jar.set(PROXY_CREDS_COOKIE_NAME, await encryptJson(creds), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  return { ok: true };
}
