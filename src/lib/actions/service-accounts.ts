"use server";

import { revalidatePath } from "next/cache";
import { LOGGER } from "@/lib/logging";
import { CONFIG } from "@/lib/config";
import {
  Actions,
  AccountType,
  GITHUB_ACTIONS_ISSUER,
  GITHUB_ACTIONS_SUBJECT_REGEX,
  MembershipRole,
  MembershipState,
  ServiceAccountCreationRequestSchema,
  type GithubWorkflowUsage,
  type ServiceAccount,
  type ServiceAccountActionState,
  type ServiceAccountFormState,
} from "@/types";
import { isAuthorized, canManageServiceAccount } from "../api/authz";
import { getPageSession } from "../api/utils";
import {
  accountTrustsTable,
  accountsTable,
  membershipsTable,
  productsTable,
} from "../clients";
import { AlreadyTrustedError } from "../clients/database/account-trusts";
import { githubWorkflowStep } from "@/lib/services/github-workflow";
import { editAccountServiceAccountsUrl } from "@/lib/urls";
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

/** Trusts a GitHub workflow, and hands back the step it adds to act as the account. */
async function trustGithub(
  account_id: string,
  subject: string,
  created_by: string
): Promise<GithubWorkflowUsage> {
  await accountTrustsTable.create({
    account_id,
    issuer: GITHUB_ACTIONS_ISSUER,
    subject,
    created_at: new Date().toISOString(),
    created_by,
  });
  return {
    subject,
    workflow_step: githubWorkflowStep(CONFIG.storage.endpoint ?? "", account_id),
  };
}

/**
 * Creates a service account under an owner, grants it the chosen products, and
 * trusts each GitHub workflow named — each gets back the step it adds to act
 * as the account.
 */
export async function createServiceAccount(
  _prev: ServiceAccountFormState,
  formData: FormData
): Promise<ServiceAccountFormState> {
  const session = await getPageSession();
  if (!session?.identity_id || !session.account) return fail("Unauthenticated");

  const parsed = ServiceAccountCreationRequestSchema.safeParse({
    account_id: formData.get("account_id"),
    name: formData.get("name"),
    type: AccountType.SERVICE,
    owner_account_id: formData.get("owner_account_id"),
  });
  if (!parsed.success) {
    return fail("Check the highlighted fields", parsed.error.flatten().fieldErrors);
  }
  const { account_id, name, owner_account_id } = parsed.data;

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
  // Authorized before any read on the owner the caller named, so that the
  // product checks below cannot be used to probe another account's products.
  if (!isAuthorized(session, account, Actions.CreateAccount)) {
    return fail("You do not manage that account");
  }

  const subjects = formData.getAll("github_subject").map(String).filter(Boolean);
  const badSubject = subjects.find((s) => !GITHUB_ACTIONS_SUBJECT_REGEX.test(s));
  if (badSubject) {
    return fail(`${badSubject} does not name one repository and one ref or environment`);
  }

  const grants: { product_id: string; role: MembershipRole }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("grant:")) continue;
    const product_id = key.slice("grant:".length);
    const role = value as MembershipRole;
    if (![MembershipRole.ReadData, MembershipRole.WriteData].includes(role)) {
      return fail(`${product_id}: access must be read or write`);
    }
    if (!(await productsTable.fetchById(owner_account_id, product_id))) {
      return fail(`${owner_account_id} has no product ${product_id}`);
    }
    grants.push({ product_id, role });
  }

  try {
    await accountsTable.create(account);
  } catch (error) {
    if ((error as { name?: string })?.name === "ConditionalCheckFailedException") {
      return fail("That account ID is already taken", {
        account_id: ["That account ID is already taken."],
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

  const trusts: GithubWorkflowUsage[] = [];
  for (const subject of subjects) {
    trusts.push(await trustGithub(account_id, subject, session.account.account_id));
  }

  LOGGER.info("Created service account", {
    operation: "createServiceAccount",
    metadata: { account_id, owner_account_id, grants: grants.length, trusts: trusts.length },
  });
  revalidatePath(editAccountServiceAccountsUrl(owner_account_id));
  return {
    fieldErrors: {},
    message: "",
    success: true,
    created: { account_id, name, trusts },
  };
}

async function managed(account_id: string) {
  const session = await getPageSession();
  const account = await accountsTable.fetchById(account_id);
  if (!session?.identity_id || !account) return null;
  if (account.type !== AccountType.SERVICE) return null;
  if (!canManageServiceAccount(session, account)) return null;
  return account;
}

/** Trusts one more GitHub workflow on an existing service account. */
export async function addGithubTrust(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  const session = await getPageSession();
  const account = await managed(String(formData.get("account_id") ?? ""));
  if (!account || !session?.account) {
    return outcome("You do not manage that service account", false);
  }
  // Disabled means frozen: nothing new may act as it until it is enabled.
  if (account.disabled) return outcome("That service account is disabled", false);
  const subject = String(formData.get("subject") ?? "");
  if (!GITHUB_ACTIONS_SUBJECT_REGEX.test(subject)) {
    return outcome("Name one repository and one ref or environment", false);
  }
  let added: GithubWorkflowUsage;
  try {
    added = await trustGithub(account.account_id, subject, session.account.account_id);
  } catch (error) {
    if (error instanceof AlreadyTrustedError) return outcome("Already trusted", false);
    throw error;
  }
  revalidatePath(editAccountServiceAccountsUrl(account.owner_account_id));
  return { ...outcome("", true), added };
}

export async function removeTrust(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  const account = await managed(String(formData.get("account_id") ?? ""));
  if (!account) return outcome("You do not manage that service account", false);
  const issuer = String(formData.get("issuer") ?? "");
  const subject = String(formData.get("subject") ?? "");
  if (!issuer || !subject) return outcome("No such trust on this account", false);
  // Keyed by the account, so this can only ever touch its own trusts.
  await accountTrustsTable.delete(account.account_id, issuer, subject);
  revalidatePath(editAccountServiceAccountsUrl(account.owner_account_id));
  return outcome("Trust removed", true);
}

export async function setServiceAccountDisabled(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  const account = await managed(String(formData.get("account_id") ?? ""));
  if (!account) return outcome("You do not manage that service account", false);
  const disabled = formData.get("disabled") === "true";
  await accountsTable.update({ ...account, disabled, updated_at: new Date().toISOString() });
  revalidatePath(editAccountServiceAccountsUrl(account.owner_account_id));
  return outcome(disabled ? "Service account disabled" : "Service account enabled", true);
}

/** Removes the account, every grant it held, and every way it could sign in. */
export async function deleteServiceAccount(
  _prev: ServiceAccountActionState,
  formData: FormData
): Promise<ServiceAccountActionState> {
  const account = await managed(String(formData.get("account_id") ?? ""));
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
  return outcome("Service account deleted", true);
}
