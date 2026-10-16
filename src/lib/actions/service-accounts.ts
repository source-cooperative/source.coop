"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  MembershipState,
  publicKey,
  type ServiceAccountActionState,
  type ServiceAccountFormState,
} from "@/types";
import { managedServiceAccount } from "@/lib/accounts/service-accounts";
import { getPageSession } from "../api/utils";
import { membershipsTable, serviceAccountKeysTable } from "@/lib/clients/database";
import { expiryFrom, mintApiKey } from "@/lib/accounts/service-account-keys";
import { editAccountServiceAccountsUrl, editServiceAccountUrl } from "@/lib/urls";
import type { OperationResult } from "@/lib/operations/result";
import {
  inviteMember,
  revokeMembership,
  updateMembership,
} from "@/lib/operations/memberships";
import { deleteAccount, updateAccount } from "@/lib/operations/accounts";
import * as operations from "@/lib/operations/service-accounts";

const fail = (message: string, fieldErrors = {}): ServiceAccountFormState => ({
  fieldErrors,
  message,
  success: false,
});

/** The owner's list and the account's own page both show what changed. */
function revalidate(owner_account_id: string, account_id: string) {
  revalidatePath(editAccountServiceAccountsUrl(owner_account_id));
  revalidatePath(editServiceAccountUrl(owner_account_id, account_id));
}

const accountId = (formData: FormData) => String(formData.get("account_id") ?? "");

/**
 * An operation's result as action state, revalidating what it changed. A
 * service account's id starts with its owner's, up to the `--`.
 */
function outcome(
  formData: FormData,
  result: OperationResult<unknown>,
  message: string
): ServiceAccountActionState {
  if (!result.ok) return { message: result.message, success: false };
  const account_id = accountId(formData);
  revalidate(account_id.split("--")[0], account_id);
  return { message, success: true };
}

/**
 * Creates a service account, issues an API key if one is asked for, and goes
 * to the account's page. An issued key is returned instead, for the form to
 * carry to that page, which shows it once.
 */
export async function createServiceAccount(
  _prev: ServiceAccountFormState,
  formData: FormData
): Promise<ServiceAccountFormState> {
  const session = await getPageSession();
  if (!session?.account) return fail("Unauthenticated");
  const owner_account_id = String(formData.get("owner_account_id") ?? "");

  // Minted before anything is written, so a bad label or expiry leaves nothing behind.
  let minted: ReturnType<typeof mintApiKey> = null;
  if (formData.has("key_label")) {
    const expires_at = expiryFrom(formData);
    if (expires_at === undefined) return fail("Expiry must be between 1 and 3650 days");
    minted = mintApiKey({
      // The operation settles the id; the record takes it once the account exists.
      account_id: "",
      label: String(formData.get("key_label")),
      created_by: session.account.account_id,
      expires_at,
    });
    if (!minted) {
      return fail("Check the highlighted fields", { key_label: ["Up to 64 characters."] });
    }
  }

  const result = await operations.createServiceAccount(session, owner_account_id, {
    local_id: formData.get("local_id"),
    name: formData.get("name"),
    github_subjects: formData.getAll("github_subject").map(String).filter(Boolean),
    grants: [...formData].flatMap(([key, role]) =>
      key.startsWith("grant:") ? [{ product_id: key.slice("grant:".length), role }] : []
    ),
  });
  if (!result.ok) return fail(result.message, result.fieldErrors);
  const { account_id } = result.value;

  if (minted) await serviceAccountKeysTable.create({ ...minted.record, account_id });
  revalidatePath(editAccountServiceAccountsUrl(owner_account_id));
  const account_url = editServiceAccountUrl(owner_account_id, account_id);
  // The key is in this response and nowhere else; a redirect would lose it.
  if (minted) {
    return {
      fieldErrors: {},
      message: "",
      success: true,
      issued: {
        key: minted.key,
        record: publicKey({ ...minted.record, account_id }),
        account_url,
      },
    };
  }
  redirect(account_url);
}

export async function addGithubTrust(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  return outcome(
    formData,
    await operations.addGithubTrust(await getPageSession(), accountId(formData), {
      subject: formData.get("subject"),
    }),
    "Trusted"
  );
}

export async function removeTrust(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  return outcome(
    formData,
    await operations.removeTrust(await getPageSession(), accountId(formData), {
      issuer: formData.get("issuer"),
      subject: formData.get("subject"),
    }),
    "Trust removed"
  );
}

export async function setServiceAccountDisabled(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  const disabled = formData.get("disabled") === "true";
  return outcome(
    formData,
    await updateAccount(await getPageSession(), accountId(formData), {
      disabled,
    }),
    disabled ? "Service account disabled" : "Service account enabled"
  );
}

export async function renameServiceAccount(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  return outcome(
    formData,
    await updateAccount(await getPageSession(), accountId(formData), {
      name: formData.get("name"),
    }),
    "Name saved"
  );
}

export async function deleteServiceAccount(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  const result = await deleteAccount(
    await getPageSession(),
    accountId(formData)
  );
  if (!result.ok) return { message: "You do not manage that service account", success: false };
  // Its own page is gone; the list is where the user goes next.
  redirect(editAccountServiceAccountsUrl(result.value.owner_account_id));
}

/**
 * Sets how much of one of its owner's products the service account reaches,
 * through the product's memberships: `none` revokes its grant, and read or
 * write grants it or changes the grant it has.
 */
export async function setProductAccess(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  const session = await getPageSession();
  const account = await managedServiceAccount(session, accountId(formData));
  if (!account) return { message: "You do not manage that service account", success: false };
  const product_id = String(formData.get("product_id") ?? "");
  const access = String(formData.get("access") ?? "");
  const held = (await membershipsTable.listByUser(account.account_id)).find(
    (m) => m.product_id === product_id && m.state === MembershipState.Member
  );

  const result =
    access === "none"
      ? held
        ? await revokeMembership(session, held.membership_id)
        : null
      : held
        ? await updateMembership(session, held.membership_id, { role: access })
        : await inviteMember(session, {
            account_id: account.account_id,
            membership_account_id: account.owner_account_id,
            product_id,
            role: access,
          });
  if (result && !result.ok) return { message: result.message, success: false };
  revalidate(account.owner_account_id, account.account_id);
  return { message: "", success: true };
}
