import { createHash, randomInt, randomUUID } from "crypto";
import { serviceAccountKeysTable } from "@/lib/clients";
import { LOGGER } from "@/lib/logging";
import {
  API_KEY_ALPHABET,
  API_KEY_PREFIX,
  apiKeyChecksum,
  ServiceAccountKeyRecordSchema,
  type RevokedVia,
  type ServiceAccountKeyRecord,
} from "@/types";

/** Hex SHA-256 of a key: what the record holds, and what the proxy presents. */
export const hashApiKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** `expires_in_days` from a form: null for no expiry, undefined when out of range. */
export function expiryFrom(formData: FormData): string | null | undefined {
  const raw = String(formData.get("expires_in_days") ?? "").trim();
  if (raw === "") return null;
  const days = Number(raw);
  if (!Number.isInteger(days) || days < 1 || days > 3650) return undefined;
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

/**
 * Mints an API key: an opaque secret (ADR-013) and the record that stands for
 * it, keyed by its hash. Nothing is stored; the caller stores the record and
 * shows the key once. Null when the label is empty or too long.
 */
export function mintApiKey(fields: {
  account_id: string;
  label: string;
  created_by: string;
  expires_at: string | null;
}): { key: string; record: ServiceAccountKeyRecord } | null {
  // 30 characters drawn uniformly from base62 (178 bits), then their checksum.
  const body = Array.from({ length: 30 }, () => API_KEY_ALPHABET[randomInt(62)]).join("");
  const key = API_KEY_PREFIX + body + apiKeyChecksum(body);
  const parsed = ServiceAccountKeyRecordSchema.safeParse({
    ...fields,
    label: fields.label.trim(),
    key_hash: hashApiKey(key),
    key_id: randomUUID(),
    hint: key.slice(-6),
    created_at: new Date().toISOString(),
  });
  return parsed.success ? { key, record: parsed.data } : null;
}

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
