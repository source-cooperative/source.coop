"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { LOGGER } from "@/lib/logging";
import {
  ServiceAccountKeySchema,
  type ApiKeyActionState,
  type ServiceAccountKey,
} from "@/types";
import { getPageSession } from "../api/utils";
import { accountsTable, serviceAccountKeysTable } from "../clients";
import { managedServiceAccount } from "@/lib/accounts/service-accounts";
import { mintApiKey } from "@/lib/services/proxy-keys";
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
 * Issues an API key: records it here, has the data proxy sign it, and returns
 * the key once. The key's subject is the service account's own id, which the
 * API resolves directly (ADR-014); nothing else is written for it.
 */
export async function issueApiKey(
  _prev: ApiKeyActionState,
  formData: FormData
): Promise<ApiKeyActionState> {
  const session = await getPageSession();
  const account = await managedServiceAccount(session, String(formData.get("account_id") ?? ""));
  if (!account || !session?.identity_id || !session.account) {
    return outcome("You do not manage that service account", false);
  }
  // Disabled means frozen: no new key until it is enabled again.
  if (account.disabled) return outcome("That service account is disabled", false);
  const expires_at = expiryFrom(formData);
  if (expires_at === undefined) return outcome("Expiry must be between 1 and 3650 days", false);

  const now = new Date().toISOString();
  const parsed = ServiceAccountKeySchema.safeParse({
    jti: randomUUID(),
    account_id: account.account_id,
    label: String(formData.get("label") ?? "").trim(),
    created_at: now,
    created_by: session.account.account_id,
    expires_at,
  });
  if (!parsed.success) return outcome("Give the key a label of up to 64 characters", false);
  const record: ServiceAccountKey = parsed.data;

  // The proxy forwards a bare subject and the resolver tries Ory first, so a
  // service account whose id is also a person's Ory identity id would resolve
  // to that person. Such an account gets no key.
  if (await accountsTable.fetchByOryId(account.account_id)) {
    return outcome("That account id is also a sign-in identity, so it cannot hold keys", false);
  }

  await serviceAccountKeysTable.create(record);
  let key: string;
  try {
    key = await mintApiKey(session.identity_id, {
      account_id: account.account_id,
      jti: record.jti,
      expires_at: record.expires_at,
    });
  } catch (error) {
    // No record without a key: the row would look like a live credential.
    await serviceAccountKeysTable.delete(record.jti);
    LOGGER.error("API key minting failed", {
      operation: "issueApiKey",
      metadata: { account_id: account.account_id, jti: record.jti },
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return outcome("The data proxy could not sign the key. Try again.", false);
  }

  LOGGER.info("Issued API key", {
    operation: "issueApiKey",
    metadata: { account_id: account.account_id, jti: record.jti, expires_at },
  });
  revalidatePath(editAccountServiceAccountsUrl(account.owner_account_id));
  revalidatePath(editServiceAccountUrl(account.owner_account_id, account.account_id));
  return { ...outcome("", true), issued: { key, record } };
}

async function ownKey(formData: FormData) {
  const session = await getPageSession();
  const account = await managedServiceAccount(session, String(formData.get("account_id") ?? ""));
  if (!account) return null;
  const key = await serviceAccountKeysTable.fetchByJti(String(formData.get("jti") ?? ""));
  return key && key.account_id === account.account_id ? { account, key } : null;
}

/** Revocation takes effect for new exchanges within the proxy's cache TTL. */
export async function revokeApiKey(
  _prev: ApiKeyActionState,
  formData: FormData
): Promise<ApiKeyActionState> {
  const own = await ownKey(formData);
  if (!own) return outcome("No such key on a service account you manage", false);
  if (own.key.revoked_at) return outcome("Already revoked", false);
  await serviceAccountKeysTable.set(own.key.jti, "revoked_at", new Date().toISOString());
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
  await serviceAccountKeysTable.set(own.key.jti, "expires_at", expires_at);
  revalidatePath(editAccountServiceAccountsUrl(own.account.owner_account_id));
  revalidatePath(editServiceAccountUrl(own.account.owner_account_id, own.account.account_id));
  return outcome(expires_at ? "Expiry updated" : "Key no longer expires", true);
}
