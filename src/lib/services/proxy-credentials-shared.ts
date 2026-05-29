import "server-only";

import type { ProxyCredentials } from "@/lib/actions/proxy-credentials";

/** Name of the encrypted HTTP-only cookie holding the user's proxy credentials. */
export const PROXY_CREDS_COOKIE_NAME = "sc_proxy_creds";

/** Re-mint credentials this far before their actual expiry, to avoid races. */
export const REFRESH_BEFORE_MS = 5 * 60 * 1000;

/** True if the credentials are valid for at least REFRESH_BEFORE_MS more. */
export function isFresh(creds: ProxyCredentials): boolean {
  return new Date(creds.expiration).getTime() - REFRESH_BEFORE_MS > Date.now();
}
