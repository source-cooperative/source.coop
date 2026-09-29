import { createHash } from "crypto";
import { serviceAccountKeysTable } from "@/lib/clients";
import { LOGGER } from "@/lib/logging";
import type { RevokedVia } from "@/types";

/** Hex SHA-256 of a key: what the record holds, and what the proxy presents. */
export const hashApiKey = (key: string) => createHash("sha256").update(key).digest("hex");

/**
 * Revokes an API key on the word of whoever presents it: a key seen outside
 * its owner's hands has leaked, and holding it is all the proof there is. An
 * expired key, or one whose service account is disabled, is revoked too, since
 * extending the expiry or enabling the account would bring it back. Resolves to
 * whether the key exists at all; `metadata` goes into the log line, never the key.
 */
export async function revokeLeakedKey(
  key: string,
  via: RevokedVia,
  metadata: Record<string, unknown> = {}
): Promise<boolean> {
  const record = await serviceAccountKeysTable.fetchByHash(hashApiKey(key));
  if (record && !record.revoked_at) {
    await serviceAccountKeysTable.revoke(record.key_hash, via);
    LOGGER.warn("Revoked a leaked API key", {
      operation: "revokeLeakedKey",
      metadata: { key_id: record.key_id, account_id: record.account_id, via, ...metadata },
    });
  }
  return record !== null;
}
