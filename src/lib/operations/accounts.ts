import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  Account,
  AccountEmailSchema,
  AccountFlags,
  AccountFlagsSchema,
  AccountProfileResponse,
  AccountSchema,
  AccountType,
  Actions,
  BIO_MAX_LENGTH,
  isServiceAccount,
  MAX_NAME_LENGTH,
  MembershipSchema,
  MIN_NAME_LENGTH,
  ServiceAccount,
  UserSession,
} from "@/types";
import { isAuthorized } from "@/lib/api/authz";
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
  OperationResult,
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
  })
  .partial()
  .openapi("UpdateAccount");

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

export async function getAccount(
  session: UserSession | null,
  account_id: string
): Promise<OperationResult<Account>> {
  const account = await fetchAccount(account_id);
  if (!account) return missing(account_id);
  if (!isAuthorized(session, account, Actions.GetAccount)) {
    return deny(session, "You may not view this account");
  }
  return ok(account);
}

/** Whether an account by this ID exists, which anyone may ask. */
export async function accountExists(account_id: string): Promise<boolean> {
  return !!(await fetchAccount(account_id));
}

function profileOf(account: Account): AccountProfileResponse {
  return {
    ...account.metadata_public,
    name: account.name,
    type: account.type,
    profile_image: avatarUrl(account),
  };
}

export async function getAccountProfile(
  session: UserSession | null,
  account_id: string
): Promise<OperationResult<AccountProfileResponse>> {
  const account = await fetchAccount(account_id);
  if (!account) return missing(account_id);
  if (!isAuthorized(session, account, Actions.GetAccountProfile)) {
    // A service account has no profile, and a disabled one is hidden.
    return account.disabled || isServiceAccount(account)
      ? missing(account_id)
      : deny(session, "You may not view this profile");
  }
  return ok(profileOf(account));
}

/**
 * Changes the fields given and leaves the rest. Editing takes PutAccountProfile
 * and `disabled` takes DisableAccount, so a caller may hold either alone.
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
  if (!mayEdit && !mayDisable) return deny(session, "You may not edit this account");
  const parsed = UpdateAccountSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { name, disabled, websites, email, ...fields } = parsed.data;

  const edits = name !== undefined || PROFILE_FIELDS.some((f) => parsed.data[f] !== undefined);
  if (edits && !mayEdit) return deny(session, "You may not edit this account");
  if (disabled !== undefined && disabled !== account.disabled && !mayDisable) {
    return deny(session, `You may not ${disabled ? "disable" : "enable"} this account`);
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
  } as Account);
  LOGGER.info("Updated account", {
    operation: "updateAccount",
    metadata: {
      account_id,
      fields: Object.keys(parsed.data),
      disabled,
      by: session.account?.account_id,
    },
  });
  revalidatePath(accountUrl(account_id));
  revalidatePath(editAccountProfileUrl(account_id));
  return ok(updated);
}

export async function getAccountFlags(
  session: UserSession | null,
  account_id: string
): Promise<OperationResult<AccountFlags[]>> {
  const account = await fetchAccount(account_id);
  if (!account) return missing(account_id);
  if (!isAuthorized(session, account, Actions.GetAccountFlags)) {
    return deny(session, "You may not view this account's flags");
  }
  return ok(account.flags);
}

/** Replaces an account's flags. */
export async function updateAccountFlags(
  session: UserSession | null,
  account_id: string,
  input: unknown
): Promise<OperationResult<AccountFlags[]>> {
  if (!session) return unauthenticated();
  const account = await fetchAccount(account_id);
  if (!account) return missing(account_id);
  if (!isAuthorized(session, account, Actions.PutAccountFlags)) {
    return deny(session, "You may not change this account's flags");
  }
  const parsed = AccountFlagsSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  if (isServiceAccount(account) && parsed.data.includes(AccountFlags.ADMIN)) {
    return invalid("A service account cannot hold the admin flag");
  }
  const updated = await accountsTable.update({
    account_id,
    type: account.type,
    name: account.name,
    flags: parsed.data,
  } as Account);
  LOGGER.info("Updated account flags", {
    operation: "updateAccountFlags",
    metadata: { account_id, flags: parsed.data, by: session.account?.account_id },
  });
  revalidatePath(editAccountPermissionsUrl(account_id));
  return ok(updated.flags);
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
  // Hidden from whoever may not manage it, as in getAccountProfile.
  if (!(await managedServiceAccount(session, account_id))) return missing(account_id);
  // Disabled first: nothing new is granted, issued or trusted while the rest
  // is torn down, and no key exchanges in the meantime.
  await accountsTable.update({ ...account, disabled: true, updated_at: new Date().toISOString() });
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
