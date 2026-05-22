"use server";

import { cookies } from "next/headers";
import {
  getProxyCredentials,
  type ProxyCredentials,
} from "@/lib/actions/proxy-credentials";
import { encryptJson, decryptJson } from "./encrypted-cookie";

const COOKIE_NAME = "sc_proxy_creds";
const REFRESH_BEFORE_MS = 5 * 60 * 1000;

const inflight = new Map<string, Promise<ProxyCredentials>>();

function isFresh(creds: ProxyCredentials): boolean {
  return new Date(creds.expiration).getTime() - REFRESH_BEFORE_MS > Date.now();
}

/**
 * Returns proxy credentials for the current user, caching them in an
 * encrypted HTTP-only cookie keyed by the user's session. The cookie travels
 * with the user across Vercel function instances, so cold starts only re-mint
 * on the first request that arrives without a fresh cookie.
 *
 * Concurrent calls from the same session on a single instance are coalesced
 * via an in-flight promise map.
 */
export async function ensureProxyCredentials(
  sessionId: string,
): Promise<ProxyCredentials> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    const cached = await decryptJson<ProxyCredentials>(token);
    if (cached && isFresh(cached)) return cached;
  }

  const existing = inflight.get(sessionId);
  if (existing) return existing;

  const promise = (async () => {
    const creds = await getProxyCredentials();
    const maxAge = Math.max(
      0,
      Math.floor((new Date(creds.expiration).getTime() - Date.now()) / 1000),
    );
    jar.set(COOKIE_NAME, await encryptJson(creds), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    return creds;
  })();

  inflight.set(sessionId, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(sessionId);
  }
}

export async function clearCachedProxyCredentials(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
