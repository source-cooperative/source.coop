import "server-only";

import { CONFIG } from "@/lib/config";
import { getOryIdToken } from "@/lib/actions/proxy-credentials";
import { API_KEY_PREFIX } from "@/types";

/**
 * Asks the data proxy to sign an API key for `account_id` under `jti` — the
 * proxy holds the signing key (ADR-013), this app holds the record. The call
 * is made as `identityId`, whoever is issuing the key; the proxy checks with
 * this API that they manage the account before it signs anything.
 *
 * SECURITY: `identityId` is trusted as-is, exactly as in getProxyCredentials.
 * Pass an identity from a verified session, never from request input.
 */
export async function mintApiKey(
  identityId: string,
  key: { account_id: string; jti: string; expires_at: string | null }
): Promise<string> {
  const idToken = await getOryIdToken(identityId);
  const resp = await fetch(`${CONFIG.storage.endpoint}/.keys`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${idToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(key),
    signal: AbortSignal.timeout(15_000),
  });
  if (!resp.ok) {
    throw new Error(`Key minting failed: ${resp.status}`);
  }
  const { key: minted } = (await resp.json()) as { key?: unknown };
  if (typeof minted !== "string" || !minted.startsWith(API_KEY_PREFIX)) {
    throw new Error("Key minting returned no key");
  }
  return minted;
}
