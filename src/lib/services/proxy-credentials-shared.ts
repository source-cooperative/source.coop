import "server-only";

import type { ProxyCredentials } from "@/lib/actions/proxy-credentials";

/** Name of the encrypted HTTP-only cookie holding the user's proxy credentials. */
export const PROXY_CREDS_COOKIE_NAME = "sc_proxy_creds";

/**
 * Shape persisted in the encrypted cookie: the STS credentials plus the Ory
 * identity they were minted for. The identity binding lets readers reject a
 * still-fresh cookie left behind by a different user on the same browser
 * (a user switch that never passed through /logout).
 */
export interface CachedProxyCredentials extends ProxyCredentials {
  identityId: string;
}

/** Re-mint credentials this far before their actual expiry, to avoid races. */
export const REFRESH_BEFORE_MS = 5 * 60 * 1000;

/** True if the credentials are valid for at least REFRESH_BEFORE_MS more. */
export function isFresh(creds: ProxyCredentials): boolean {
  return new Date(creds.expiration).getTime() - REFRESH_BEFORE_MS > Date.now();
}
