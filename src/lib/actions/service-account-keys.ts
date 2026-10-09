"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { LOGGER } from "@/lib/logging";
import { publicKey, type ApiKeyActionState } from "@/types";
import { getPageSession } from "../api/utils";
import { serviceAccountKeysTable } from "../clients";
import { expiryFrom, mintApiKey } from "@/lib/accounts/service-account-keys";
import { managedServiceAccount } from "@/lib/accounts/service-accounts";
import { editAccountServiceAccountsUrl, editServiceAccountUrl } from "@/lib/urls";

const outcome = (message: string, success: boolean): ApiKeyActionState => ({
  message,
  success,
});

/**
 * Issues an API key: an opaque secret (ADR-013) whose hash is the record's
 * key. Nothing signs it and nothing but this response ever carries it. The
 * proxy resolves it to this service account by asking the API.
 */
export async function issueApiKey(
  _prev: ApiKeyActionState,
  formData: FormData
): Promise<ApiKeyActionState> {
  const t = await getTranslations("ServiceAccountKeyActions");
  const session = await getPageSession();
  const account = await managedServiceAccount(session, String(formData.get("account_id") ?? ""));
  if (!account || !session?.account) {
    return outcome(t("notManaged"), false);
  }
  // Disabled means frozen: no new key until it is enabled again.
  if (account.disabled) return outcome(t("disabled"), false);
  const expires_at = expiryFrom(formData);
  if (expires_at === undefined) return outcome(t("expiryRange"), false);

  const minted = mintApiKey({
    account_id: account.account_id,
    label: String(formData.get("label") ?? ""),
    created_by: session.account.account_id,
    expires_at,
  });
  if (!minted) return outcome(t("labelTooLong"), false);
  const { key, record } = minted;

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
  return key ? { account, key, session } : null;
}

/** Revocation takes effect for new exchanges within the proxy's cache TTL. */
export async function revokeApiKey(
  _prev: ApiKeyActionState,
  formData: FormData
): Promise<ApiKeyActionState> {
  const t = await getTranslations("ServiceAccountKeyActions");
  const own = await ownKey(formData);
  if (!own) return outcome(t("noSuchKey"), false);
  if (own.key.revoked_at) return outcome(t("alreadyRevoked"), false);
  await serviceAccountKeysTable.revoke(own.key.key_hash, "owner", own.session?.account?.account_id);
  revalidatePath(editAccountServiceAccountsUrl(own.account.owner_account_id));
  revalidatePath(editServiceAccountUrl(own.account.owner_account_id, own.account.account_id));
  return outcome(t("revoked"), true);
}

/** Expiry may be extended for a workload that needs longer, or shortened during an incident. */
export async function setApiKeyExpiry(
  _prev: ApiKeyActionState,
  formData: FormData
): Promise<ApiKeyActionState> {
  const t = await getTranslations("ServiceAccountKeyActions");
  const own = await ownKey(formData);
  if (!own) return outcome(t("noSuchKey"), false);
  const expires_at = expiryFrom(formData);
  if (expires_at === undefined) return outcome(t("expiryRange"), false);
  await serviceAccountKeysTable.set(own.key.key_hash, "expires_at", expires_at);
  revalidatePath(editAccountServiceAccountsUrl(own.account.owner_account_id));
  revalidatePath(editServiceAccountUrl(own.account.owner_account_id, own.account.account_id));
  return outcome(expires_at ? t("expiryUpdated") : t("noExpiry"), true);
}
