import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  Account,
  AccountCreationRequestSchema,
  AccountEmailSchema,
  AccountFlags,
  AccountFlagsSchema,
  AccountSchema,
  AccountType,
  Actions,
  DEFAULT_ORGANIZATION_FLAGS,
  BIO_MAX_LENGTH,
  isServiceAccount,
  MAX_NAME_LENGTH,
  MembershipRole,
  MembershipSchema,
  MembershipState,
  MIN_NAME_LENGTH,
  OrganizationalAccount,
  ServiceAccount,
  PublicAccount,
  UserSession,
} from "@/types";
import { randomUUID } from "crypto";
import { isAdmin, isAuthorized } from "@/lib/api/authz";
import { searchUsers } from "@/lib/api/user-lookup";
import { isConditionalCheckFailed } from "@/lib/clients/database/errors";
import { avatarUrl } from "@/lib/avatar";
import { LOGGER } from "@/lib/logging";
import {
  accountsTable,
  membershipsTable,
  serviceAccountKeysTable,
} from "@/lib/clients/database";
import { managedServiceAccount } from "@/lib/accounts/service-accounts";
import {
  accountUrl,
  editAccountPermissionsUrl,
  editAccountProfileUrl,
  editAccountServiceAccountsUrl,
  editServiceAccountUrl,
} from "@/lib/urls";
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

export const WhoamiSchema = z
  .object({
    identity_id: z
      .string()
      .nullable()
      .openapi({ description: "The caller's sign-in identity; null for a service account." }),
    account: AccountSchema.optional().openapi({
      description: "The caller's account; absent for someone signed in who hasn't made one yet.",
    }),
    memberships: z.array(MembershipSchema).optional(),
  })
  .openapi("Whoami");

// An empty string clears a field; leaving it out keeps it.
const clearable = (schema: z.ZodString) => schema.or(z.literal(""));

export const UpdateAccountSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(MIN_NAME_LENGTH, `Name must be at least ${MIN_NAME_LENGTH} characters`)
      .max(MAX_NAME_LENGTH, `Name must not exceed ${MAX_NAME_LENGTH} characters`),
    bio: clearable(
      z.string().max(BIO_MAX_LENGTH, `Bio must not exceed ${BIO_MAX_LENGTH} characters`)
    ),
    location: clearable(z.string().max(128, "Location must not exceed 128 characters")),
    orcid: clearable(z.string()).openapi({ description: "An individual's ORCID iD." }),
    ror_id: clearable(z.string()).openapi({ description: "An organization's ROR ID." }),
    websites: z.array(z.string()).openapi({
      description:
        "Replaces the account's websites. A URL without a scheme is taken as `https://`.",
    }),
    email: clearable(z.string().trim()).openapi({
      description:
        "An organization's contact address, unverified until confirmed. Ignored for anyone else, whose email is their sign-in address.",
    }),
    disabled: z.boolean().openapi({
      description:
        "A disabled account can't sign in, and nothing new may be attached to it until it is enabled again.",
    }),
    flags: AccountFlagsSchema.openapi({
      description:
        "Replaces what the account may do beyond the basics, such as create products or administer the platform. Only an admin may change them, and a service account may never hold `admin`.",
    }),
  })
  .partial()
  .openapi("UpdateAccount");

export const SearchAccountsQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Search for at least two characters")
    .openapi({
      description: "Part of an account's ID or name. An admin may also search by a whole email address.",
    }),
  member_of: z.string().optional().openapi({
    description:
      "An account you may invite members to. Its service accounts are searched too. Ignored for any other account.",
  }),
});

export const AccountSuggestionSchema = z
  .object({
    account_id: z.string(),
    name: z.string(),
    type: z.nativeEnum(AccountType),
    profile_image: z.string().optional(),
    disabled: z.literal(true).optional().openapi({
      description: "Present only on a disabled account, which only an admin's email search finds.",
    }),
  })
  .openapi("AccountSuggestion");

export const AccountSuggestionPageSchema = pageSchema(
  "AccountSuggestionPage",
  AccountSuggestionSchema
);

export const CreateOrganizationSchema = AccountCreationRequestSchema.pick({
  account_id: true,
  name: true,
})
  .extend({
    owner_account_id: z.string().optional().openapi({
      description:
        "The person who owns the new organization. Defaults to you. Only an admin may name someone else.",
    }),
  })
  .openapi("CreateOrganization");

// The profile fields: everything a service account, which has only a name, lacks.
const PROFILE_FIELDS = ["bio", "location", "orcid", "ror_id", "websites", "email"] as const;

async function fetchAccount(account_id: string) {
  return account_id ? ((await accountsTable.fetchById(account_id)) ?? null) : null;
}

const missing = (account_id: string) => notFound(`Account ${account_id} not found`);

export function whoami(
  session: UserSession | null
): OperationResult<z.infer<typeof WhoamiSchema>> {
  if (!session) return unauthenticated();
  const { identity_id, account, memberships } = session;
  return ok({ identity_id, account, memberships });
}

/**
 * The whole record for whoever GetAccount allows, and the public view for
 * whoever may only see the profile. A service account has no profile, and a
 * disabled account's is hidden, so either is not found.
 */
export async function getAccount(
  session: UserSession | null,
  account_id: string
): Promise<OperationResult<Account | PublicAccount>> {
  const account = await fetchAccount(account_id);
  if (!account) return missing(account_id);
  if (isAuthorized(session, account, Actions.GetAccount)) return ok(account);
  if (isAuthorized(session, account, Actions.GetAccountProfile)) return ok(publicView(account));
  return account.disabled || isServiceAccount(account)
    ? missing(account_id)
    : deny(session, "You may not view this account");
}

/** Whether an account by this ID exists, which anyone may ask. */
export async function accountExists(account_id: string): Promise<boolean> {
  return !!(await fetchAccount(account_id));
}

/** The part of an account anyone may read. */
export function publicView(account: Account): PublicAccount {
  const { account_id, type, name, disabled, metadata_public } = account;
  return { account_id, type, name, disabled, metadata_public, profile_image: avatarUrl(account) };
}

/**
 * Changes the fields given and leaves the rest. Editing takes PutAccountProfile,
 * `disabled` takes DisableAccount and `flags` takes PutAccountFlags, so a
 * caller may hold any one alone.
 */
export async function updateAccount(
  session: UserSession | null,
  account_id: string,
  input: unknown
): Promise<OperationResult<Account>> {
  if (!session) return unauthenticated();
  const account = await fetchAccount(account_id);
  if (!account) return missing(account_id);
  const mayEdit = isAuthorized(session, account, Actions.PutAccountProfile);
  const mayDisable = isAuthorized(session, account, Actions.DisableAccount);
  const mayFlag = isAuthorized(session, account, Actions.PutAccountFlags);
  if (!mayEdit && !mayDisable && !mayFlag) return deny(session, "You may not edit this account");
  const parsed = UpdateAccountSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { name, disabled, flags, websites, email, ...fields } = parsed.data;

  const edits = name !== undefined || PROFILE_FIELDS.some((f) => parsed.data[f] !== undefined);
  if (edits && !mayEdit) return deny(session, "You may not edit this account");
  if (disabled !== undefined && disabled !== account.disabled && !mayDisable) {
    return deny(session, `You may not ${disabled ? "disable" : "enable"} this account`);
  }
  if (flags && !mayFlag) return deny(session, "You may not change this account's flags");
  if (flags && isServiceAccount(account) && flags.includes(AccountFlags.ADMIN)) {
    return invalid("A service account cannot hold the admin flag", "flags");
  }
  const extra = isServiceAccount(account) && PROFILE_FIELDS.find((f) => parsed.data[f] !== undefined);
  if (extra) return invalid("A service account has only a name", extra);
  if (fields.orcid !== undefined && account.type !== AccountType.INDIVIDUAL) {
    return invalid("Only a person has an ORCID iD", "orcid");
  }
  if (fields.ror_id !== undefined && account.type !== AccountType.ORGANIZATION) {
    return invalid("Only an organization has a ROR ID", "ror_id");
  }
  const now = new Date().toISOString();

  let domains = account.metadata_public.domains;
  if (websites) {
    const urls = websites
      .map((w) => w.trim())
      .filter(Boolean)
      .map((w) => (/^https?:\/\//.test(w) ? w : `https://${w}`));
    if (!urls.every((url) => URL.canParse(url))) {
      return invalid("Each website must be a URL", "websites");
    }
    // An unchanged website keeps its record, verification included.
    domains = urls.map(
      (domain) =>
        account.metadata_public.domains?.find((d) => d.domain === domain) ?? {
          domain,
          status: "unverified" as const,
          created_at: now,
        }
    );
  }

  let emails: Account["emails"];
  if (email !== undefined && account.type === AccountType.ORGANIZATION) {
    const current = account.emails?.find((e) => e.is_primary);
    if (!email) {
      emails = [];
    } else if (email !== current?.address) {
      // Only a changed address is rewritten, so resubmitting the current one
      // keeps its verified state.
      if (!AccountEmailSchema.shape.address.safeParse(email).success) {
        return invalid("Invalid email address", "email");
      }
      emails = [{ address: email, verified: false, is_primary: true, added_at: now }];
    }
  }

  let metadata_public;
  if (websites || Object.keys(fields).length) {
    metadata_public = { ...account.metadata_public, domains };
    for (const [key, value] of Object.entries(fields)) {
      (metadata_public as Record<string, unknown>)[key] = value || undefined;
    }
  }
  // Only the fields edited here, so a concurrent change to anything else, the
  // flags above all, isn't written back over.
  const updated = await accountsTable.update({
    account_id,
    type: account.type,
    ...(name !== undefined && { name }),
    ...(emails && { emails }),
    ...(metadata_public && { metadata_public }),
    // A resubmitted `disabled` isn't written, so one read before a concurrent
    // disable can't undo it.
    ...(disabled !== undefined && disabled !== account.disabled && { disabled }),
    ...(flags && { flags }),
  } as Account);
  LOGGER.info("Updated account", {
    operation: "updateAccount",
    metadata: {
      account_id,
      fields: Object.keys(parsed.data),
      disabled,
      flags,
      by: session.account?.account_id,
    },
  });
  revalidatePath(accountUrl(account_id));
  revalidatePath(editAccountProfileUrl(account_id));
  if (flags) revalidatePath(editAccountPermissionsUrl(account_id));
  return ok(updated);
}

/**
 * Deletes a service account, with every grant it held and every way it could
 * sign in. A person or an organization is never deleted, only disabled, which
 * `updateAccount` does.
 */
export async function deleteAccount(
  session: UserSession | null,
  account_id: string
): Promise<OperationResult<ServiceAccount>> {
  if (!session) return unauthenticated();
  const account = await fetchAccount(account_id);
  if (!account) return missing(account_id);
  if (!isServiceAccount(account)) {
    // A person's or an organization's existence is public; only a caller who
    // may disable it is told how.
    return isAuthorized(session, account, Actions.DisableAccount)
      ? conflict(
          'Only a service account can be deleted; disable this account with PATCH { "disabled": true }'
        )
      : deny(session, "You may not delete this account");
  }
  // Hidden from whoever may not manage it, so a refusal doesn't confirm it exists.
  if (!(await managedServiceAccount(session, account_id))) return missing(account_id);
  // Disabled first: nothing new is granted, issued or trusted while the rest
  // is torn down, and no key exchanges in the meantime. Only `disabled` is
  // written, as updateAccount writes only what it changes.
  await accountsTable.update({ account_id, type: account.type, disabled: true } as Account);
  const [memberships, keys] = await Promise.all([
    membershipsTable.listByUser(account_id),
    serviceAccountKeysTable.listByAccount(account_id),
  ]);
  // Keys are deleted rather than revoked, so an account that later takes the
  // id starts with none; the exchange also refuses a key older than its
  // account, which covers any key this misses.
  await Promise.all([
    ...memberships.map((m) => membershipsTable.delete(m.membership_id)),
    ...keys.map((k) => serviceAccountKeysTable.delete(k.key_hash)),
  ]);
  // Its trusts go with the account row.
  await accountsTable.delete(account_id);
  LOGGER.info("Deleted service account", {
    operation: "deleteAccount",
    metadata: {
      account_id,
      owner_account_id: account.owner_account_id,
      by: session.account?.account_id,
    },
  });
  revalidatePath(editAccountServiceAccountsUrl(account.owner_account_id));
  revalidatePath(editServiceAccountUrl(account.owner_account_id, account_id));
  return ok(account);
}

/**
 * Type-ahead search over people. With `member_of`, the service accounts of an
 * account the caller may invite to are searched too. An email finds the one
 * account signed in with it, which only an admin may ask. Needs a session, so
 * it isn't an open directory to scrape.
 */
export async function searchAccounts(
  session: UserSession | null,
  query: unknown
): Promise<OperationResult<Page<z.infer<typeof AccountSuggestionSchema>>>> {
  if (!session) return unauthenticated();
  const parsed = SearchAccountsQuerySchema.safeParse(query);
  if (!parsed.success) return fromZodError(parsed.error);
  const { q, member_of } = parsed.data;
  // Only a whole address, so a half-typed one is still an ordinary search.
  if (z.string().email().safeParse(q).success) {
    if (!isAdmin(session)) return deny(session, "Only an admin may search by email");
    return ok(onePage((await searchUsers(q, session.account?.account_id)).results));
  }
  // An account's service accounts are visible only to whoever may grant them
  // access; to anyone else this is an ordinary search of people.
  const mayInvite =
    member_of !== undefined &&
    isAuthorized(session, { membership_account_id: member_of }, Actions.InviteMembership);
  return ok(
    onePage(await accountsTable.searchMemberCandidates(q, mayInvite ? member_of : undefined))
  );
}

/**
 * Creates an organization owned by a person: the caller, unless an admin names
 * another. People are created by onboarding after sign-up, and service
 * accounts by `createServiceAccount`.
 */
export async function createOrganization(
  session: UserSession | null,
  input: unknown
): Promise<OperationResult<OrganizationalAccount>> {
  if (!session?.account || !isAuthorized(session, "*", Actions.CreateAccount)) {
    return deny(session, "You may not create organizations");
  }
  const parsed = CreateOrganizationSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const caller = session.account.account_id;
  const { account_id, name, owner_account_id = caller } = parsed.data;
  if (owner_account_id !== caller) {
    if (!isAdmin(session)) {
      return deny(session, "Only an admin may create an organization for someone else");
    }
    const owner = await fetchAccount(owner_account_id);
    if (owner?.type !== AccountType.INDIVIDUAL || owner.disabled) {
      return invalid(`${owner_account_id} is not an active person's account`, "owner_account_id");
    }
  }

  const now = new Date().toISOString();
  const organization: OrganizationalAccount = {
    account_id,
    type: AccountType.ORGANIZATION,
    name,
    created_at: now,
    updated_at: now,
    disabled: false,
    flags: DEFAULT_ORGANIZATION_FLAGS,
    identity_id: undefined,
    metadata_public: {},
    metadata_private: {},
  };
  // `account_id` is never checked beforehand, so the conditional write is what
  // stops one account being written over another.
  try {
    await accountsTable.create(organization);
  } catch (error) {
    if (isConditionalCheckFailed(error)) {
      return conflict("That account ID is already taken", {
        account_id: ["That account ID is already taken."],
      });
    }
    throw error;
  }
  // An organization without an owner is one nobody but an admin can manage,
  // so it goes if its owner can't be written.
  try {
    await membershipsTable.create({
      membership_id: randomUUID(),
      account_id: owner_account_id,
      membership_account_id: account_id,
      role: MembershipRole.Owners,
      state: MembershipState.Member,
      state_changed: now,
    });
  } catch (error) {
    await accountsTable.delete(account_id);
    throw error;
  }
  LOGGER.info("Created organization", {
    operation: "createOrganization",
    metadata: { account_id, owner_account_id, by: caller },
  });
  return ok(organization);
}
