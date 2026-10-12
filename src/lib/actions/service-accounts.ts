"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { LOGGER } from "@/lib/logging";
import {
  AccountType,
  GITHUB_ACTIONS_ISSUER,
  GITHUB_ACTIONS_SUBJECT_REGEX,
  MembershipRole,
  MembershipState,
  ServiceAccountCreationRequestSchema,
  serviceAccountId,
  isServiceAccount,
  publicKey,
  type ServiceAccount,
  type ServiceAccountActionState,
  type ServiceAccountFormState,
} from "@/types";
import { canManageAccountServiceAccounts } from "../api/authz";
import {
  managedServiceAccount,
  serviceAccountGrantProblem,
} from "@/lib/accounts/service-accounts";
import { getPageSession } from "../api/utils";
import {
  accountTrustsTable,
  accountsTable,
  membershipsTable,
  productsTable,
  serviceAccountKeysTable,
} from "../clients";
import { expiryFrom, mintApiKey } from "@/lib/accounts/service-account-keys";
import { AlreadyTrustedError } from "../clients/database/account-trusts";
import { redirect } from "next/navigation";
import { editAccountServiceAccountsUrl, editServiceAccountUrl } from "@/lib/urls";
import { randomUUID } from "crypto";

const fail = (message: string, fieldErrors = {}): ServiceAccountFormState => ({
  fieldErrors,
  message,
  success: false,
});
const outcome = (message: string, success: boolean): ServiceAccountActionState => ({
  message,
  success,
});

/** The owner's list and the account's own page both show what changed. */
function revalidate(account: ServiceAccount) {
  revalidatePath(editAccountServiceAccountsUrl(account.owner_account_id));
  revalidatePath(editServiceAccountUrl(account.owner_account_id, account.account_id));
}

const trustGithub = (account_id: string, subject: string, created_by: string) =>
  accountTrustsTable.create({
    account_id,
    issuer: GITHUB_ACTIONS_ISSUER,
    subject,
    created_at: new Date().toISOString(),
    created_by,
  });

/**
 * Creates a service account under an owner, grants it the chosen products,
 * trusts each GitHub workflow named, issues an API key if one is asked for,
 * and goes to the account's page. An issued key is returned instead, for the
 * form to carry to that page, which shows it once.
 */
export async function createServiceAccount(
  _prev: ServiceAccountFormState,
  formData: FormData
): Promise<ServiceAccountFormState> {
  const t = await getTranslations("ServiceAccountActions");
  const session = await getPageSession();
  if (!session?.identity_id || !session.account) return fail(t("unauthenticated"));

  const parsed = ServiceAccountCreationRequestSchema.safeParse({
    local_id: formData.get("local_id"),
    name: formData.get("name"),
    owner_account_id: formData.get("owner_account_id"),
  });
  if (!parsed.success) {
    return fail(t("checkFields"), parsed.error.flatten().fieldErrors);
  }
  const { local_id, name, owner_account_id } = parsed.data;
  const account_id = serviceAccountId(owner_account_id, local_id);

  // The owner is settled before any of its products are read, so the product
  // checks below cannot be used to probe another account's products.
  const owner = await accountsTable.fetchById(owner_account_id);
  if (!owner || !canManageAccountServiceAccounts(session, owner)) {
    return fail(t("notOwnerManager"));
  }
  if (isServiceAccount(owner)) {
    return fail(t("cannotOwnAnother"));
  }

  const now = new Date().toISOString();
  const account: ServiceAccount = {
    account_id,
    type: AccountType.SERVICE,
    name,
    owner_account_id,
    created_at: now,
    updated_at: now,
    disabled: false,
    flags: [],
    identity_id: undefined,
    metadata_public: {},
    metadata_private: {},
  };

  const subjects = [...new Set(formData.getAll("github_subject").map(String).filter(Boolean))];
  const badSubject = subjects.find((s) => !GITHUB_ACTIONS_SUBJECT_REGEX.test(s));
  if (badSubject) {
    return fail(t("badSubject", { subject: badSubject }));
  }

  const grants: { product_id: string; role: MembershipRole }[] = [];
  for (const key of new Set(formData.keys())) {
    if (!key.startsWith("grant:")) continue;
    const product_id = key.slice("grant:".length);
    const role = formData.get(key) as MembershipRole;
    if (![MembershipRole.ReadData, MembershipRole.WriteData].includes(role)) {
      return fail(t("accessReadOrWrite", { product: product_id }));
    }
    if (!(await productsTable.fetchById(owner_account_id, product_id))) {
      return fail(t("noSuchProduct", { account: owner_account_id, product: product_id }));
    }
    grants.push({ product_id, role });
  }

  // Minted before anything is written, so a bad label or expiry leaves nothing behind.
  let minted: ReturnType<typeof mintApiKey> = null;
  if (formData.has("key_label")) {
    const expires_at = expiryFrom(formData);
    if (expires_at === undefined) return fail(t("expiryRange"));
    minted = mintApiKey({
      account_id,
      label: String(formData.get("key_label")),
      created_by: session.account.account_id,
      expires_at,
    });
    if (!minted) {
      return fail(t("checkFields"), { key_label: [t("keyLabelTooLong")] });
    }
  }

  try {
    await accountsTable.create(account);
  } catch (error) {
    if ((error as { name?: string })?.name === "ConditionalCheckFailedException") {
      return fail(t("accountIdTaken"), {
        local_id: [t("localIdTaken", { owner: owner_account_id, id: local_id })],
      });
    }
    throw error;
  }

  // Its owner grants a service account access directly — nobody is at the
  // keyboard to accept an invitation.
  for (const grant of grants) {
    await membershipsTable.create({
      membership_id: randomUUID(),
      account_id,
      membership_account_id: owner_account_id,
      repository_id: grant.product_id,
      role: grant.role,
      state: MembershipState.Member,
      state_changed: now,
    });
  }

  for (const subject of subjects) {
    await trustGithub(account_id, subject, session.account.account_id);
  }

  if (minted) await serviceAccountKeysTable.create(minted.record);

  LOGGER.info("Created service account", {
    operation: "createServiceAccount",
    metadata: { account_id, owner_account_id, grants: grants.length, trusts: subjects.length, key: !!minted },
  });
  revalidatePath(editAccountServiceAccountsUrl(owner_account_id));
  const account_url = editServiceAccountUrl(owner_account_id, account_id);
  // The key is in this response and nowhere else; a redirect would lose it.
  if (minted) {
    return {
      fieldErrors: {},
      message: "",
      success: true,
      issued: { key: minted.key, record: publicKey(minted.record), account_url },
    };
  }
  redirect(account_url);
}

/** Trusts one more GitHub workflow on an existing service account. */
export async function addGithubTrust(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  const t = await getTranslations("ServiceAccountActions");
  const session = await getPageSession();
  const account = await managedServiceAccount(session, String(formData.get("account_id") ?? ""));
  if (!account || !session?.account) {
    return outcome(t("notManaged"), false);
  }
  // Disabled means frozen: nothing new may act as it until it is enabled.
  if (account.disabled) return outcome(t("disabled"), false);
  const subject = String(formData.get("subject") ?? "");
  if (!GITHUB_ACTIONS_SUBJECT_REGEX.test(subject)) {
    return outcome(t("nameOneRepo"), false);
  }
  try {
    await trustGithub(account.account_id, subject, session.account.account_id);
  } catch (error) {
    if (error instanceof AlreadyTrustedError) return outcome(t("alreadyTrusted"), false);
    throw error;
  }
  revalidate(account);
  return outcome(t("trusted"), true);
}

export async function removeTrust(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  const t = await getTranslations("ServiceAccountActions");
  const account = await managedServiceAccount(
    await getPageSession(),
    String(formData.get("account_id") ?? "")
  );
  if (!account) return outcome(t("notManaged"), false);
  const issuer = String(formData.get("issuer") ?? "");
  const subject = String(formData.get("subject") ?? "");
  if (!issuer || !subject) return outcome(t("noSuchTrust"), false);
  // Keyed by the account, so this can only ever touch its own trusts.
  await accountTrustsTable.delete(account.account_id, issuer, subject);
  revalidate(account);
  return outcome(t("trustRemoved"), true);
}

export async function setServiceAccountDisabled(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  const t = await getTranslations("ServiceAccountActions");
  const account = await managedServiceAccount(
    await getPageSession(),
    String(formData.get("account_id") ?? "")
  );
  if (!account) return outcome(t("notManaged"), false);
  const disabled = formData.get("disabled") === "true";
  await accountsTable.update({ ...account, disabled, updated_at: new Date().toISOString() });
  revalidate(account);
  return outcome(disabled ? t("accountDisabled") : t("accountEnabled"), true);
}

/** Changes the display name; the id, which software signs in as, stays. */
export async function renameServiceAccount(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  const t = await getTranslations("ServiceAccountActions");
  const account = await managedFrom(formData);
  if (!account) return outcome(t("notManaged"), false);
  const parsed = ServiceAccountCreationRequestSchema.shape.name.safeParse(formData.get("name"));
  if (!parsed.success) return outcome(parsed.error.issues[0].message, false);
  await accountsTable.update({ ...account, name: parsed.data, updated_at: new Date().toISOString() });
  revalidate(account);
  return outcome(t("nameSaved"), true);
}

/** Removes the account, every grant it held, and every way it could sign in. */
export async function deleteServiceAccount(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  const t = await getTranslations("ServiceAccountActions");
  const account = await managedServiceAccount(
    await getPageSession(),
    String(formData.get("account_id") ?? "")
  );
  if (!account) return outcome(t("notManaged"), false);
  for (const membership of await membershipsTable.listByUser(account.account_id)) {
    await membershipsTable.delete(membership.membership_id);
  }
  // Its trusts go with the account row.
  await accountsTable.delete(account.account_id);
  LOGGER.info("Deleted service account", {
    operation: "deleteServiceAccount",
    metadata: { account_id: account.account_id, owner_account_id: account.owner_account_id },
  });
  revalidatePath(editAccountServiceAccountsUrl(account.owner_account_id));
  // Its own page is gone; the list is where the user goes next.
  redirect(editAccountServiceAccountsUrl(account.owner_account_id));
}

const managedFrom = async (formData: FormData) =>
  managedServiceAccount(await getPageSession(), String(formData.get("account_id") ?? ""));

/**
 * Sets how much of one of its owner's products the service account reaches:
 * `none` revokes its grant, the way a person's membership is revoked; read or
 * write grants it — directly, as at creation, since nobody is at the keyboard
 * to accept an invitation — or changes the grant it has.
 */
export async function setProductAccess(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  const t = await getTranslations("ServiceAccountActions");
  const account = await managedFrom(formData);
  if (!account) return outcome(t("notManaged"), false);
  const repository_id = String(formData.get("product_id") ?? "");
  const access = String(formData.get("access") ?? "");
  const held = (await membershipsTable.listByUser(account.account_id)).find(
    (m) => m.repository_id === repository_id && m.state === MembershipState.Member
  );
  const now = new Date().toISOString();

  if (access === "none") {
    if (held) {
      await membershipsTable.update({ ...held, state: MembershipState.Revoked, state_changed: now });
    }
  } else {
    const role = access as MembershipRole;
    const problem = serviceAccountGrantProblem(
      account,
      { membership_account_id: account.owner_account_id, repository_id },
      role
    );
    if (problem) return outcome(problem, false);
    if (held) {
      await membershipsTable.update({ ...held, role, state_changed: now });
    } else {
      if (!(await productsTable.fetchById(account.owner_account_id, repository_id))) {
        return outcome(t("noSuchProduct", { account: account.owner_account_id, product: repository_id }), false);
      }
      await membershipsTable.create({
        membership_id: randomUUID(),
        account_id: account.account_id,
        membership_account_id: account.owner_account_id,
        repository_id,
        role,
        state: MembershipState.Member,
        state_changed: now,
      });
    }
  }
  revalidate(account);
  return outcome("", true);
}
