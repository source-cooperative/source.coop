import { z } from "zod";
import {
  AccountTrust,
  AccountTrustSchema,
  AccountType,
  GITHUB_ACTIONS_ISSUER,
  GITHUB_ACTIONS_SUBJECT_REGEX,
  isServiceAccount,
  MembershipRole,
  ServiceAccount,
  publicKey,
  ServiceAccountCreationRequestSchema,
  ServiceAccountKey,
  ServiceAccountKeySchema,
  ServiceAccountSchema,
  serviceAccountId,
  UserSession,
  Actions,
} from "@/types";
import { canManageAccountServiceAccounts, isAuthorized } from "@/lib/api/authz";
import { managedServiceAccount } from "@/lib/accounts/service-accounts";
import { MAX_EXPIRY_DAYS, mintApiKey } from "@/lib/accounts/service-account-keys";
import { LOGGER } from "@/lib/logging";
import {
  accountsTable,
  accountTrustsTable,
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
  onePage,
  OperationResult,
  Page,
  pageSchema,
  unauthenticated,
} from "./result";
import { inviteMember } from "./memberships";

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

const ExpiresAtSchema = z
  .string()
  .datetime()
  .nullable()
  .refine(
    (at) =>
      at === null ||
      (Date.parse(at) > Date.now() && Date.parse(at) <= Date.now() + MAX_EXPIRY_DAYS * 86_400_000),
    `Expiry must be in the future and at most ${MAX_EXPIRY_DAYS} days away`
  )
  .openapi({
    description: `When the key stops working, at most ${MAX_EXPIRY_DAYS} days away. Null for a key that works until it is revoked.`,
    example: "2027-01-01T00:00:00.000Z",
  });

export const IssueKeySchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(1, "Give the key a label")
      .max(64, "Give the key a label of up to 64 characters")
      .openapi({ description: "What the key is for, to tell it apart from the others.", example: "HPC cron job" }),
    expires_at: ExpiresAtSchema,
  })
  .openapi("ServiceAccountKeyRequest");

export const UpdateKeySchema = z
  .object({
    expires_at: ExpiresAtSchema.optional(),
    revoked: z.literal(true).optional().openapi({
      description: "Set to `true` to revoke the key. A revoked key can't be restored.",
    }),
  })
  .refine((update) => update.expires_at !== undefined || update.revoked, "Send expires_at, revoked, or both")
  .openapi("ServiceAccountKeyUpdate");

export const IssuedKeySchema = ServiceAccountKeySchema.extend({
  key: z.string().openapi({
    description: "The key itself. This response is the only place it appears.",
    example: "sck_…",
  }),
}).openapi("IssuedServiceAccountKey");

type IssuedKey = z.infer<typeof IssuedKeySchema>;

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
    key: IssueKeySchema.optional().openapi({ description: "An API key to issue with the account." }),
  })
  .openapi("ServiceAccountCreationRequest");

export const CreatedServiceAccountSchema = ServiceAccountSchema.extend({
  key: IssuedKeySchema.optional(),
}).openapi("CreatedServiceAccount");

export const AddGithubTrustSchema = z
  .object({ subject: GithubSubjectSchema })
  .openapi("GithubTrustRequest");

export const RemoveTrustQuerySchema = z.object({
  issuer: z.string().min(1).openapi({ example: GITHUB_ACTIONS_ISSUER }),
  subject: z.string().min(1).openapi({ example: "repo:acme/data:ref:refs/heads/main" }),
});

export const ServiceAccountPageSchema = pageSchema("ServiceAccountPage", ServiceAccountSchema);
export const AccountTrustPageSchema = pageSchema("AccountTrustPage", AccountTrustSchema);
export const ServiceAccountKeyPageSchema = pageSchema("ServiceAccountKeyPage", ServiceAccountKeySchema);

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
  return ok(onePage(await accountsTable.listByOwner(owner_account_id)));
}

/**
 * Creates a service account under an owner, grants it the owner's products
 * named, trusts each GitHub workflow named, and issues an API key if one is
 * asked for. Each grant is authorized before the account is written, so a
 * refused one leaves nothing behind.
 */
export async function createServiceAccount(
  session: UserSession | null,
  owner_account_id: string,
  input: unknown
): Promise<OperationResult<ServiceAccount & { key?: IssuedKey }>> {
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

  // A subject or product named twice is one trust, one grant; a second
  // grant would be refused as a duplicate after the account exists.
  const subjects = [...new Set(parsed.data.github_subjects)];
  const grants = [...new Map(parsed.data.grants.map((g) => [g.product_id, g])).values()];
  for (const { product_id, role } of grants) {
    // inviteMember's own check, asked here while nothing is written yet.
    const target = { membership_account_id: owner_account_id, product_id, role };
    if (!isAuthorized(session, target, Actions.InviteMembership)) {
      return deny(session, `You may not grant access to ${product_id}`);
    }
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

  // As a member of each product, the way any grant is made; a service account
  // becomes one at once, with nobody at its keyboard to accept.
  for (const { product_id, role } of grants) {
    const granted = await inviteMember(session, {
      account_id: account.account_id,
      membership_account_id: owner_account_id,
      product_id,
      role,
    });
    if (!granted.ok) return granted;
  }
  for (const subject of subjects) {
    await trustGithub(account.account_id, subject, session.account.account_id);
  }
  const key = parsed.data.key && (await storeKey(account.account_id, parsed.data.key, session.account.account_id));

  audit("createServiceAccount", session, {
    account_id: account.account_id,
    owner_account_id,
    grants: grants.length,
    trusts: subjects.length,
    key_id: key?.key_id,
  });
  return ok(key ? { ...account, key } : account);
}

export async function listTrusts(
  session: UserSession | null,
  account_id: string
): Promise<OperationResult<Page<AccountTrust>>> {
  const found = await managed(session, account_id);
  if (!found.ok) return found;
  const trusts = await accountTrustsTable.listByAccount(account_id);
  return ok(onePage(trusts.map(publicTrust)));
}

/** A trust as the API shows it, without the key the table stores it under. */
const publicTrust = (trust: AccountTrust) => AccountTrustSchema.parse(trust);

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
    return ok(publicTrust(trust));
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
  return ok(publicTrust(trust));
}

export async function listKeys(
  session: UserSession | null,
  account_id: string
): Promise<OperationResult<Page<ServiceAccountKey>>> {
  const found = await managed(session, account_id);
  if (!found.ok) return found;
  return ok(onePage((await serviceAccountKeysTable.listByAccount(account_id)).map(publicKey)));
}

/**
 * Mints a key (ADR-013) and stores the record that stands for it, keyed by
 * its hash. The key is in the result and nowhere else.
 */
async function storeKey(
  account_id: string,
  input: z.infer<typeof IssueKeySchema>,
  created_by: string
): Promise<IssuedKey> {
  // IssueKeySchema has checked everything mintApiKey refuses.
  const { key, record } = mintApiKey({ account_id, created_by, ...input })!;
  await serviceAccountKeysTable.create(record);
  return { ...publicKey(record), key };
}

/** Issues an API key for an existing service account. */
export async function issueKey(
  session: UserSession | null,
  account_id: string,
  input: unknown
): Promise<OperationResult<IssuedKey>> {
  const found = await managed(session, account_id);
  if (!found.ok) return found;
  // Disabled means frozen: no new key until it is enabled again.
  if (found.value.disabled) return conflict("That service account is disabled");
  const parsed = IssueKeySchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const issued = await storeKey(account_id, parsed.data, session!.account!.account_id);
  audit("issueKey", session!, { account_id, key_id: issued.key_id, expires_at: issued.expires_at });
  return ok(issued);
}

/**
 * Changes a key's expiry, or revokes it. Expiry may be extended for a
 * workload that needs longer, or shortened during an incident. Revocation
 * takes effect for new exchanges within the proxy's cache TTL.
 */
export async function updateKey(
  session: UserSession | null,
  account_id: string,
  key_id: string,
  input: unknown
): Promise<OperationResult<ServiceAccountKey>> {
  const found = await managed(session, account_id);
  if (!found.ok) return found;
  const parsed = UpdateKeySchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { expires_at, revoked } = parsed.data;
  const key = (await serviceAccountKeysTable.listByAccount(account_id)).find(
    (k) => k.key_id === key_id
  );
  if (!key) return notFound("No such key on this service account");
  if (revoked && key.revoked_at) return conflict("Already revoked");
  const by = session!.account!.account_id;
  // One field at a time, so a concurrent revocation isn't written back over.
  if (expires_at !== undefined) await serviceAccountKeysTable.set(key.key_hash, "expires_at", expires_at);
  if (revoked) await serviceAccountKeysTable.revoke(key.key_hash, "owner", by);
  audit("updateKey", session!, { account_id, key_id, expires_at, revoked });
  return ok(
    publicKey({
      ...key,
      ...(expires_at !== undefined && { expires_at }),
      ...(revoked && { revoked_at: new Date().toISOString(), revoked_via: "owner" as const, revoked_by: by }),
    })
  );
}
