"use server";

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
import { canManageAccount } from "../api/authz";
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
  const session = await getPageSession();
  if (!session?.identity_id || !session.account) return fail("Unauthenticated");

  const parsed = ServiceAccountCreationRequestSchema.safeParse({
    local_id: formData.get("local_id"),
    name: formData.get("name"),
    owner_account_id: formData.get("owner_account_id"),
  });
  if (!parsed.success) {
    return fail("Check the highlighted fields", parsed.error.flatten().fieldErrors);
  }
  const { local_id, name, owner_account_id } = parsed.data;
  const account_id = serviceAccountId(owner_account_id, local_id);

  // The owner is settled before any of its products are read, so the product
  // checks below cannot be used to probe another account's products.
  const owner = await accountsTable.fetchById(owner_account_id);
  if (!owner || !canManageAccount(session, owner)) {
    return fail("You do not manage that account");
  }
  if (isServiceAccount(owner)) {
    return fail("A service account cannot own another");
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
    return fail(`${badSubject} does not name one repository and one ref or environment`);
  }

  const grants: { product_id: string; role: MembershipRole }[] = [];
  for (const key of new Set(formData.keys())) {
    if (!key.startsWith("grant:")) continue;
    const product_id = key.slice("grant:".length);
    const role = formData.get(key) as MembershipRole;
    if (![MembershipRole.ReadData, MembershipRole.WriteData].includes(role)) {
      return fail(`${product_id}: access must be read or write`);
    }
    if (!(await productsTable.fetchById(owner_account_id, product_id))) {
      return fail(`${owner_account_id} has no product ${product_id}`);
    }
    grants.push({ product_id, role });
  }

  // Minted before anything is written, so a bad label or expiry leaves nothing behind.
  let minted: ReturnType<typeof mintApiKey> = null;
  if (formData.has("key_label")) {
    const expires_at = expiryFrom(formData);
    if (expires_at === undefined) return fail("Expiry must be between 1 and 3650 days");
    minted = mintApiKey({
      account_id,
      label: String(formData.get("key_label")),
      created_by: session.account.account_id,
      expires_at,
    });
    if (!minted) {
      return fail("Check the highlighted fields", { key_label: ["Up to 64 characters."] });
    }
  }

  try {
    await accountsTable.create(account);
  } catch (error) {
    if ((error as { name?: string })?.name === "ConditionalCheckFailedException") {
      return fail("That account ID is already taken", {
        local_id: [`${owner_account_id} already has a service account called ${local_id}.`],
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
  const session = await getPageSession();
  const account = await managedServiceAccount(session, String(formData.get("account_id") ?? ""));
  if (!account || !session?.account) {
    return outcome("You do not manage that service account", false);
  }
  // Disabled means frozen: nothing new may act as it until it is enabled.
  if (account.disabled) return outcome("That service account is disabled", false);
  const subject = String(formData.get("subject") ?? "");
  if (!GITHUB_ACTIONS_SUBJECT_REGEX.test(subject)) {
    return outcome("Name one repository and one ref or environment", false);
  }
  try {
    await trustGithub(account.account_id, subject, session.account.account_id);
  } catch (error) {
    if (error instanceof AlreadyTrustedError) return outcome("Already trusted", false);
    throw error;
  }
  revalidate(account);
  return outcome("Trusted", true);
}

export async function removeTrust(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  const account = await managedServiceAccount(
    await getPageSession(),
    String(formData.get("account_id") ?? "")
  );
  if (!account) return outcome("You do not manage that service account", false);
  const issuer = String(formData.get("issuer") ?? "");
  const subject = String(formData.get("subject") ?? "");
  if (!issuer || !subject) return outcome("No such trust on this account", false);
  // Keyed by the account, so this can only ever touch its own trusts.
  await accountTrustsTable.delete(account.account_id, issuer, subject);
  revalidate(account);
  return outcome("Trust removed", true);
}

export async function setServiceAccountDisabled(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  const account = await managedServiceAccount(
    await getPageSession(),
    String(formData.get("account_id") ?? "")
  );
  if (!account) return outcome("You do not manage that service account", false);
  const disabled = formData.get("disabled") === "true";
  await accountsTable.update({ ...account, disabled, updated_at: new Date().toISOString() });
  revalidate(account);
  return outcome(disabled ? "Service account disabled" : "Service account enabled", true);
}

/** Removes the account, every grant it held, and every way it could sign in. */
export async function deleteServiceAccount(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  const account = await managedServiceAccount(
    await getPageSession(),
    String(formData.get("account_id") ?? "")
  );
  if (!account) return outcome("You do not manage that service account", false);
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
  const account = await managedFrom(formData);
  if (!account) return outcome("You do not manage that service account", false);
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
        return outcome(`${account.owner_account_id} has no product ${repository_id}`, false);
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
