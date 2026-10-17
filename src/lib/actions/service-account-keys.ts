"use server";

import { revalidatePath } from "next/cache";
import type { ApiKeyActionState } from "@/types";
import { getPageSession } from "../api/utils";
import { expiryFrom } from "@/lib/accounts/service-account-keys";
import { issueKey, updateKey } from "@/lib/operations/service-accounts";
import type { OperationResult } from "@/lib/operations/result";
import { editAccountServiceAccountsUrl, editServiceAccountUrl } from "@/lib/urls";

const EXPIRY_RANGE = "Expiry must be between 1 and 3650 days";

const accountId = (formData: FormData) => String(formData.get("account_id") ?? "");

/**
 * An operation's result as action state, revalidating what it changed. A
 * service account's id starts with its owner's, up to the `--`.
 */
function outcome(formData: FormData, result: OperationResult<unknown>, message: string): ApiKeyActionState {
  if (!result.ok) return { message: result.message, success: false };
  const account_id = accountId(formData);
  const owner = account_id.split("--")[0];
  revalidatePath(editAccountServiceAccountsUrl(owner));
  revalidatePath(editServiceAccountUrl(owner, account_id));
  return { message, success: true };
}

/** Issues an API key, and returns it: the only time it is seen. */
export async function issueApiKey(
  _prev: ApiKeyActionState,
  formData: FormData
): Promise<ApiKeyActionState> {
  const expires_at = expiryFrom(formData);
  if (expires_at === undefined) return { message: EXPIRY_RANGE, success: false };
  const result = await issueKey(await getPageSession(), accountId(formData), {
    label: String(formData.get("label") ?? ""),
    expires_at,
  });
  const state = outcome(formData, result, "");
  if (!result.ok) return state;
  const { key, ...record } = result.value;
  return { ...state, issued: { key, record } };
}

export async function revokeApiKey(
  _prev: ApiKeyActionState,
  formData: FormData
): Promise<ApiKeyActionState> {
  return outcome(
    formData,
    await updateKey(await getPageSession(), accountId(formData), String(formData.get("key_id") ?? ""), {
      revoked: true,
    }),
    "Key revoked"
  );
}

export async function setApiKeyExpiry(
  _prev: ApiKeyActionState,
  formData: FormData
): Promise<ApiKeyActionState> {
  const expires_at = expiryFrom(formData);
  if (expires_at === undefined) return { message: EXPIRY_RANGE, success: false };
  return outcome(
    formData,
    await updateKey(await getPageSession(), accountId(formData), String(formData.get("key_id") ?? ""), {
      expires_at,
    }),
    expires_at ? "Expiry updated" : "Key no longer expires"
  );
}
