import { randomUUID } from "crypto";
import { z } from "zod";
import {
  AccountTrust,
  AccountTrustSchema,
  AccountType,
  GITHUB_ACTIONS_ISSUER,
  GITHUB_ACTIONS_SUBJECT_REGEX,
  isServiceAccount,
  MembershipRole,
  MembershipState,
  ServiceAccount,
  ServiceAccountCreationRequestSchema,
  ServiceAccountSchema,
  serviceAccountId,
  UserSession,
} from "@/types";
import { canManageAccountServiceAccounts } from "@/lib/api/authz";
import { managedServiceAccount } from "@/lib/accounts/service-accounts";
import { LOGGER } from "@/lib/logging";
import {
  accountsTable,
  accountTrustsTable,
  membershipsTable,
  productsTable,
  serviceAccountKeysTable,
} from "@/lib/clients/database";
import { AlreadyTrustedError } from "@/lib/clients/database/account-trusts";
import { isConditionalCheckFailed } from "@/lib/clients/database/errors";
import {
  conflict,
  deny,
  fromZodError,
  invalid,
  notFound,
  ok,
  OperationResult,
  unauthenticated,
} from "./result";

const GithubSubjectSchema = z
  .string()
  .regex(
    GITHUB_ACTIONS_SUBJECT_REGEX,
    "Name one repository and one branch, tag or environment"
  )
  .openapi({
    description:
      "A GitHub Actions subject pinned to one repository and one ref or environment: `repo:{owner}/{repo}:ref:{ref}` or `repo:{owner}/{repo}:environment:{name}`.",
    example: "repo:acme/data:ref:refs/heads/main",
  });

export const CreateServiceAccountSchema = ServiceAccountCreationRequestSchema.omit({
  owner_account_id: true,
})
  .extend({
    github_subjects: z.array(GithubSubjectSchema).default([]).openapi({
      description: "GitHub Actions workflows that may act as the account.",
    }),
    grants: z
      .array(
        z.object({
          product_id: z.string().min(1),
          role: z.enum([MembershipRole.ReadData, MembershipRole.WriteData]),
        })
      )
      .default([])
      .openapi({ description: "The owner's products the account may read or write." }),
  })
  .openapi("ServiceAccountCreationRequest");

export const UpdateServiceAccountSchema = z
  .object({
    name: ServiceAccountCreationRequestSchema.shape.name.optional(),
    disabled: z.boolean().optional().openapi({
      description:
        "A disabled account can't sign in, and nothing new may be attached to it until it is enabled.",
    }),
  })
  .openapi("UpdateServiceAccount");

export const AddGithubTrustSchema = z
  .object({ subject: GithubSubjectSchema })
  .openapi("GithubTrustRequest");

export const RemoveTrustQuerySchema = z.object({
  issuer: z.string().min(1).openapi({ example: GITHUB_ACTIONS_ISSUER }),
  subject: z.string().min(1).openapi({ example: "repo:acme/data:ref:refs/heads/main" }),
});

/** Every item fits on one page; the cursor leaves room for that to change. */
const page = <T extends z.ZodTypeAny>(name: string, item: T) =>
  z
    .object({
      items: z.array(item),
      next_cursor: z.string().nullable(),
    })
    .openapi(name);

export const ServiceAccountPageSchema = page("ServiceAccountPage", ServiceAccountSchema);
export const AccountTrustPageSchema = page("AccountTrustPage", AccountTrustSchema);

type Page<T> = { items: T[]; next_cursor: null };

/**
 * The service account `account_id` names, if the caller manages it. Missing,
 * not a service account, and someone else's all get the same answer.
 */
async function managed(
  session: UserSession | null,
  account_id: string
): Promise<OperationResult<ServiceAccount>> {
  if (!session) return unauthenticated();
  // DynamoDB rejects an empty key outright.
  const account = account_id && (await managedServiceAccount(session, account_id));
  return account ? ok(account) : notFound(`You manage no service account ${account_id}`);
}

function audit(operation: string, session: UserSession, metadata: object) {
  LOGGER.info("Service account changed", {
    operation,
    context: "service-accounts",
    metadata: { by: session.account?.account_id, ...metadata },
  });
}

export async function listServiceAccounts(
  session: UserSession | null,
  owner_account_id: string
): Promise<OperationResult<Page<ServiceAccount>>> {
  const owner = owner_account_id && (await accountsTable.fetchById(owner_account_id));
  if (!owner) return notFound(`Account ${owner_account_id} not found`);
  if (!canManageAccountServiceAccounts(session, owner)) {
    return deny(session, "You do not manage service accounts for this account");
  }
  return ok({ items: await accountsTable.listByOwner(owner_account_id), next_cursor: null });
}

/**
 * Creates a service account under an owner, grants it the owner's products
 * named, and trusts each GitHub workflow named. Nothing is written until all
 * of it checks out.
 */
export async function createServiceAccount(
  session: UserSession | null,
  owner_account_id: string,
  input: unknown
): Promise<OperationResult<ServiceAccount>> {
  if (!session?.account) {
    return deny(session, "You do not manage service accounts for that account");
  }
  const parsed = CreateServiceAccountSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { local_id, name } = parsed.data;

  // The owner is settled before any of its products are read, so the product
  // checks below cannot be used to probe another account's products.
  const owner = owner_account_id && (await accountsTable.fetchById(owner_account_id));
  if (!owner) return notFound(`Account ${owner_account_id} not found`);
  if (!canManageAccountServiceAccounts(session, owner)) {
    return deny(session, "You do not manage service accounts for that account");
  }
  if (isServiceAccount(owner)) {
    return invalid("A service account cannot own another");
  }

  // A subject or product named twice is one trust, one grant.
  const subjects = [...new Set(parsed.data.github_subjects)];
  const grants = [...new Map(parsed.data.grants.map((g) => [g.product_id, g])).values()];
  for (const { product_id } of grants) {
    if (!(await productsTable.fetchById(owner_account_id, product_id))) {
      return invalid(`${owner_account_id} has no product ${product_id}`, "grants");
    }
  }

  const now = new Date().toISOString();
  const account: ServiceAccount = {
    account_id: serviceAccountId(owner_account_id, local_id),
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
  try {
    await accountsTable.create(account);
  } catch (error) {
    if (isConditionalCheckFailed(error)) {
      return conflict("That account ID is already taken", {
        local_id: [`${owner_account_id} already has a service account called ${local_id}.`],
      });
    }
    throw error;
  }

  // Its owner grants a service account access directly — nobody is at the
  // keyboard to accept an invitation.
  for (const { product_id, role } of grants) {
    await membershipsTable.create({
      membership_id: randomUUID(),
      account_id: account.account_id,
      membership_account_id: owner_account_id,
      repository_id: product_id,
      role,
      state: MembershipState.Member,
      state_changed: now,
    });
  }
  for (const subject of subjects) {
    await trustGithub(account.account_id, subject, session.account.account_id);
  }

  audit("createServiceAccount", session, {
    account_id: account.account_id,
    owner_account_id,
    grants: grants.length,
    trusts: subjects.length,
  });
  return ok(account);
}

/** Renames, disables or enables. The id, which software signs in as, stays. */
export async function updateServiceAccount(
  session: UserSession | null,
  account_id: string,
  input: unknown
): Promise<OperationResult<ServiceAccount>> {
  const found = await managed(session, account_id);
  if (!found.ok) return found;
  const parsed = UpdateServiceAccountSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const updated = await accountsTable.update({
    ...found.value,
    ...parsed.data,
    updated_at: new Date().toISOString(),
  });
  audit("updateServiceAccount", session!, { account_id, ...parsed.data });
  return ok(updated as ServiceAccount);
}

/** Removes the account, every grant it held, and every way it could sign in. */
export async function deleteServiceAccount(
  session: UserSession | null,
  account_id: string
): Promise<OperationResult<ServiceAccount>> {
  const found = await managed(session, account_id);
  if (!found.ok) return found;
  for (const membership of await membershipsTable.listByUser(account_id)) {
    await membershipsTable.delete(membership.membership_id);
  }
  // Revoked rather than left behind: the id can be taken again, and a key
  // still live would sign in as whatever account takes it.
  for (const key of await serviceAccountKeysTable.listByAccount(account_id)) {
    if (!key.revoked_at) {
      await serviceAccountKeysTable.revoke(key.key_hash, "owner", session!.account!.account_id);
    }
  }
  // Its trusts go with the account row.
  await accountsTable.delete(account_id);
  audit("deleteServiceAccount", session!, {
    account_id,
    owner_account_id: found.value.owner_account_id,
  });
  return ok(found.value);
}

export async function listTrusts(
  session: UserSession | null,
  account_id: string
): Promise<OperationResult<Page<AccountTrust>>> {
  const found = await managed(session, account_id);
  if (!found.ok) return found;
  return ok({ items: await accountTrustsTable.listByAccount(account_id), next_cursor: null });
}

const trustGithub = (account_id: string, subject: string, created_by: string) =>
  accountTrustsTable.create({
    account_id,
    issuer: GITHUB_ACTIONS_ISSUER,
    subject,
    created_at: new Date().toISOString(),
    created_by,
  });

/** Trusts one more GitHub workflow to act as an existing service account. */
export async function addGithubTrust(
  session: UserSession | null,
  account_id: string,
  input: unknown
): Promise<OperationResult<AccountTrust>> {
  const found = await managed(session, account_id);
  if (!found.ok) return found;
  // Disabled means frozen: nothing new may act as it until it is enabled.
  if (found.value.disabled) return conflict("That service account is disabled");
  const parsed = AddGithubTrustSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    const trust = await trustGithub(
      account_id,
      parsed.data.subject,
      session!.account!.account_id
    );
    audit("addGithubTrust", session!, { account_id, subject: trust.subject });
    return ok(trust);
  } catch (error) {
    if (error instanceof AlreadyTrustedError) return conflict("Already trusted");
    throw error;
  }
}

export async function removeTrust(
  session: UserSession | null,
  account_id: string,
  input: unknown
): Promise<OperationResult<AccountTrust>> {
  const found = await managed(session, account_id);
  if (!found.ok) return found;
  const parsed = RemoveTrustQuerySchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { issuer, subject } = parsed.data;
  const trust = (await accountTrustsTable.listByAccount(account_id, true)).find(
    (t) => t.issuer === issuer && t.subject === subject
  );
  if (!trust) return notFound("No such trust on this account");
  // Keyed by the account, so this can only ever touch its own trusts.
  await accountTrustsTable.delete(account_id, issuer, subject);
  audit("removeTrust", session!, { account_id, issuer, subject });
  return ok(trust);
}
