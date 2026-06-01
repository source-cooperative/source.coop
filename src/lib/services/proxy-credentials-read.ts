import "server-only";

import { cookies } from "next/headers";
import type { ProxyCredentials } from "@/lib/actions/proxy-credentials";
import { decryptJson } from "./encrypted-cookie";
import { PROXY_CREDS_COOKIE_NAME, isFresh } from "./proxy-credentials-shared";

/**
 * Render-safe read of the user's cached proxy credentials.
 *
 * Reads and decrypts the `sc_proxy_creds` cookie and returns the credentials
 * only if they are present and still fresh. This NEVER mints credentials and
 * NEVER writes a cookie, so it is safe to call during a Server Component
 * render (where cookie mutation throws). Minting/writing happens separately
 * in an action-phase context (see `refreshProxyCredentials`).
 *
 * Returns `undefined` when there is no cookie, the cookie is stale, or the
 * cookie cannot be decrypted (tampered / wrong key).
 */
export async function readProxyCredentials(): Promise<
  ProxyCredentials | undefined
> {
  const jar = await cookies();
  const token = jar.get(PROXY_CREDS_COOKIE_NAME)?.value;
  if (!token) return undefined;

  const cached = await decryptJson<ProxyCredentials>(token);
  if (cached && isFresh(cached)) return cached;
  return undefined;
}
