"use server";

import { revalidatePath } from "next/cache";
import { randomBytes, randomUUID } from "crypto";
import { LOGGER } from "@/lib/logging";
import {
  API_KEY_PREFIX,
  publicKey,
  ServiceAccountKeyRecordSchema,
  type ApiKeyActionState,
  type ServiceAccountKeyRecord,
} from "@/types";
import { getPageSession } from "../api/utils";
import { serviceAccountKeysTable } from "../clients";
import { hashApiKey } from "@/lib/accounts/service-account-keys";
import { managedServiceAccount } from "@/lib/accounts/service-accounts";
import { editAccountServiceAccountsUrl, editServiceAccountUrl } from "@/lib/urls";

const outcome = (message: string, success: boolean): ApiKeyActionState => ({
  message,
  success,
});

/** `expires_in_days` from the form: empty for no expiry. */
function expiryFrom(formData: FormData): string | null | undefined {
  const raw = String(formData.get("expires_in_days") ?? "").trim();
  if (raw === "") return null;
  const days = Number(raw);
  if (!Number.isInteger(days) || days < 1 || days > 3650) return undefined;
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

/**
 * Issues an API key: an opaque secret (ADR-013) whose hash is the record's
 * key. Nothing signs it and nothing but this response ever carries it. The
 * proxy resolves it to this service account by asking the API.
 */
export async function issueApiKey(
  _prev: ApiKeyActionState,
  formData: FormData
): Promise<ApiKeyActionState> {
  const session = await getPageSession();
  const account = await managedServiceAccount(session, String(formData.get("account_id") ?? ""));
  if (!account || !session?.account) {
    return outcome("You do not manage that service account", false);
  }
  // Disabled means frozen: no new key until it is enabled again.
  if (account.disabled) return outcome("That service account is disabled", false);
  const expires_at = expiryFrom(formData);
  if (expires_at === undefined) return outcome("Expiry must be between 1 and 3650 days", false);

  // 32 random bytes in base64url: fixed length, no bias, all entropy.
  const key = API_KEY_PREFIX + randomBytes(32).toString("base64url");
  const now = new Date().toISOString();
  const parsed = ServiceAccountKeyRecordSchema.safeParse({
    key_hash: hashApiKey(key),
    key_id: randomUUID(),
    account_id: account.account_id,
    label: String(formData.get("label") ?? "").trim(),
    created_at: now,
    created_by: session.account.account_id,
    expires_at,
  });
  if (!parsed.success) return outcome("Give the key a label of up to 64 characters", false);
  const record: ServiceAccountKeyRecord = parsed.data;

  await serviceAccountKeysTable.create(record);
  LOGGER.info("Issued API key", {
    operation: "issueApiKey",
    metadata: { account_id: account.account_id, key_id: record.key_id, expires_at },
  });
  revalidatePath(editAccountServiceAccountsUrl(account.owner_account_id));
  revalidatePath(editServiceAccountUrl(account.owner_account_id, account.account_id));
  return { ...outcome("", true), issued: { key, record: publicKey(record) } };
}

/** The key `key_id` names, if it belongs to a service account the caller manages. */
async function ownKey(formData: FormData) {
  const session = await getPageSession();
  const account = await managedServiceAccount(session, String(formData.get("account_id") ?? ""));
  if (!account) return null;
  const key_id = String(formData.get("key_id") ?? "");
  const key = (await serviceAccountKeysTable.listByAccount(account.account_id)).find(
    (k) => k.key_id === key_id
  );
  return key ? { account, key } : null;
}

/** Revocation takes effect for new exchanges within the proxy's cache TTL. */
export async function revokeApiKey(
  _prev: ApiKeyActionState,
  formData: FormData
): Promise<ApiKeyActionState> {
  const own = await ownKey(formData);
  if (!own) return outcome("No such key on a service account you manage", false);
  if (own.key.revoked_at) return outcome("Already revoked", false);
  await serviceAccountKeysTable.set(own.key.key_hash, "revoked_at", new Date().toISOString());
  revalidatePath(editAccountServiceAccountsUrl(own.account.owner_account_id));
  revalidatePath(editServiceAccountUrl(own.account.owner_account_id, own.account.account_id));
  return outcome("Key revoked", true);
}

/** Expiry may be extended for a workload that needs longer, or shortened during an incident. */
export async function setApiKeyExpiry(
  _prev: ApiKeyActionState,
  formData: FormData
): Promise<ApiKeyActionState> {
  const own = await ownKey(formData);
  if (!own) return outcome("No such key on a service account you manage", false);
  const expires_at = expiryFrom(formData);
  if (expires_at === undefined) return outcome("Expiry must be between 1 and 3650 days", false);
  await serviceAccountKeysTable.set(own.key.key_hash, "expires_at", expires_at);
  revalidatePath(editAccountServiceAccountsUrl(own.account.owner_account_id));
  revalidatePath(editServiceAccountUrl(own.account.owner_account_id, own.account.account_id));
  return outcome(expires_at ? "Expiry updated" : "Key no longer expires", true);
}
