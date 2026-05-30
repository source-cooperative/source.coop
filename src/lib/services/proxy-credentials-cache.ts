"use server";

import { cookies } from "next/headers";
import {
  getProxyCredentials,
  type ProxyCredentials,
} from "@/lib/actions/proxy-credentials";
import { getPageSession } from "@/lib/api/utils";
import { encryptJson, decryptJson } from "./encrypted-cookie";
import {
  PROXY_CREDS_COOKIE_NAME,
  isFresh,
} from "./proxy-credentials-shared";

export interface RefreshResult {
  /** Whether the caller is authenticated and credentials are now available. */
  ok: boolean;
  /** ISO expiration of the current credentials, when `ok`. */
  expiration?: string;
  /** Whether this call minted (and wrote) new credentials. */
  minted: boolean;
}

const inflight = new Map<string, Promise<ProxyCredentials>>();

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
 * Returns early without minting when a fresh cookie already exists, and
 * coalesces concurrent mints for the same user via an in-flight promise map.
 */
export async function refreshProxyCredentials(): Promise<RefreshResult> {
  const session = await getPageSession();
  if (!session?.identity_id) {
    return { ok: false, minted: false };
  }
  const identityId = session.identity_id;

  const jar = await cookies();
  const token = jar.get(PROXY_CREDS_COOKIE_NAME)?.value;
  if (token) {
    const cached = await decryptJson<ProxyCredentials>(token);
    if (cached && isFresh(cached)) {
      return { ok: true, expiration: cached.expiration, minted: false };
    }
  }

  const existing = inflight.get(identityId);
  if (existing) {
    // Coalesced onto another in-flight mint: we awaited its result but did not
    // mint or write the cookie ourselves, so report minted: false.
    const creds = await existing;
    return { ok: true, expiration: creds.expiration, minted: false };
  }

  const promise = getProxyCredentials();
  inflight.set(identityId, promise);
  let creds: ProxyCredentials;
  try {
    creds = await promise;
  } finally {
    inflight.delete(identityId);
  }

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

  return { ok: true, expiration: creds.expiration, minted: true };
}

export async function clearCachedProxyCredentials(): Promise<void> {
  const jar = await cookies();
  jar.delete(PROXY_CREDS_COOKIE_NAME);
}
