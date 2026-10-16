"use server";

import { LOGGER } from "@/lib/logging";
import { isConditionalCheckFailed } from "@/lib/clients/database/errors";
import {
  Account,
  AccountCreationRequestSchema,
  Actions,
  AccountCreationRequest,
  DEFAULT_INDIVIDUAL_FLAGS,
  DEFAULT_ORGANIZATION_FLAGS,
  MembershipRole,
  MembershipState,
  AccountType,
  isServiceAccount,
  OrganizationCreationRequestSchema,
  OrganizationCreationRequest,
  IndividualAccount,
  OrganizationalAccount,
} from "@/types";
import { isAuthorized } from "../api/authz";
import { getPageSession } from "../api/utils";
import { accountsTable, membershipsTable } from "../clients";
import type { AccountSuggestion } from "../clients/database/accounts";
import { FormState } from "@/components/core/DynamicForm";
import { accountUrl } from "@/lib/urls";
import { randomUUID } from "crypto";
import * as ops from "@/lib/operations/accounts";
import { OperationResult, toFormState } from "@/lib/operations/result";

/**
 * Creates a new account.
 *
 * @param initialState - The initial state of the form.
 * @param formData - The form data containing the account_id and account_type.
 */
export async function createAccount(
  initialState: any,
  formData: FormData
): Promise<FormState<AccountCreationRequest>> {
  const session = await getPageSession();

  if (!session?.identity_id) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Unauthenticated",
      success: false,
    };
  }

  // Extract data from FormData
  const type = formData.get("type");
  // Service accounts have their own action, createServiceAccount, which
  // settles the owner and composes the id.
  if (type === AccountType.SERVICE) {
    return { fieldErrors: {}, data: formData, message: "Invalid form data", success: false };
  }
  const schema =
    type === AccountType.ORGANIZATION
      ? OrganizationCreationRequestSchema
      : AccountCreationRequestSchema;
  const validatedFields = schema.safeParse(Object.fromEntries(formData));

  if (!validatedFields.success) {
    return {
      fieldErrors: validatedFields.error.flatten().fieldErrors,
      data: formData,
      message: "Invalid form data",
      success: false,
    };
  }

  // Construct newAccount with explicit type and required fields
  const baseAccount = {
    type: validatedFields.data.type,
    name: validatedFields.data.name,
    account_id: validatedFields.data.account_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    disabled: false,
    metadata_public: {},
    metadata_private: {},
  };
  const newAccount: Account =
    validatedFields.data.type === AccountType.INDIVIDUAL
      ? ({
          ...baseAccount,
          identity_id: session?.identity_id,
          flags: DEFAULT_INDIVIDUAL_FLAGS,
        } as IndividualAccount)
      : ({
          ...baseAccount,
          identity_id: undefined,
          flags: DEFAULT_ORGANIZATION_FLAGS,
        } as OrganizationalAccount);

  // Check authorization
  if (!isAuthorized(session, newAccount, Actions.CreateAccount)) {
    LOGGER.warn(`Session unable to create account`, {
      operation: "createAccount",
      metadata: { session, newAccount },
    });
    return {
      fieldErrors: {},
      data: formData,
      message: "Unauthorized to create this type of account",
      success: false,
    };
  }

  // Create account. `account_id` is caller-supplied and never checked for
  // availability beforehand, so the conditional write in `create` is what stops
  // one account being written over another. A collision is an ordinary signup
  // outcome, not only an attack, so report it on the field rather than letting
  // it surface as a server error.
  let account: Account;
  try {
    account = await accountsTable.create(newAccount);
  } catch (error) {
    if (isConditionalCheckFailed(error)) {
      LOGGER.warn("Account creation rejected: account_id already taken", {
        operation: "createAccount",
        context: "account creation",
        metadata: { account_id: newAccount.account_id },
      });
      return {
        fieldErrors: { account_id: ["That account ID is already taken."] },
        data: formData,
        message: "That account ID is already taken",
        success: false,
      };
    }
    throw error;
  }

  LOGGER.info("Successfully created account", {
    operation: "createAccount",
    context: "account creation",
    metadata: { account_id: account.account_id },
  });

  if (account.type === AccountType.ORGANIZATION) {
    await membershipsTable.create({
      account_id: (validatedFields.data as OrganizationCreationRequest)
        .owner_account_id,
      role: MembershipRole.Owners,
      state: MembershipState.Member,
      state_changed: new Date().toISOString(),
      membership_id: randomUUID(),
      membership_account_id: account.account_id,
    });
  }

  // Navigate on the client (see FormState.redirectTo) rather than redirect()
  // here, so the shared layout's auth UI re-renders and the freshly onboarded
  // user isn't shown as logged out until a full reload.
  return {
    fieldErrors: {},
    data: formData,
    message: "",
    success: true,
    redirectTo:
      account.type === AccountType.INDIVIDUAL
        ? accountUrl(account.account_id, "welcome=true")
        : isServiceAccount(account)
          ? accountUrl(account.owner_account_id)
          : accountUrl(account.account_id),
  };
}

/** Updates an account's profile from the edit-profile form. */
export async function updateAccountProfile(
  initialState: any,
  formData: FormData
): Promise<FormState<any>> {
  const account_id = String(formData.get("account_id") ?? "");
  const field = (name: string) => (formData.get(name) as string | null) ?? undefined;
  return adapt("updateAccountProfile", formData, "Profile updated successfully!", async () =>
    ops.updateAccountProfile(await getPageSession(), account_id, {
      name: field("name"),
      bio: field("description"),
      orcid: field("orcid"),
      ror_id: field("ror_id"),
      email: field("email"),
      websites: [...formData.entries()]
        .filter(([key]) => key.startsWith("websites_"))
        .map(([, value]) => String(value)),
    })
  );
}

/** Updates an account's flags from the permissions form's checkboxes. */
export async function updateAccountFlags(
  initialState: any,
  formData: FormData
): Promise<FormState<any>> {
  const account_id = String(formData.get("account_id") ?? "");
  return adapt("updateAccountFlags", formData, "Account flags updated successfully!", async () =>
    ops.updateAccountFlags(
      await getPageSession(),
      account_id,
      [...formData.entries()]
        .filter(([key, value]) => key !== "account_id" && value === "on")
        .map(([key]) => key)
    )
  );
}

async function adapt<T>(
  operation: string,
  formData: FormData,
  successMessage: string,
  run: () => Promise<OperationResult<T>>
): Promise<FormState<any>> {
  try {
    return toFormState(await run(), formData, successMessage);
  } catch (error) {
    LOGGER.error("Account update failed", { operation, error });
    return toFormState(
      { ok: false, error: "conflict", message: "Failed to save. Please try again." },
      formData,
      ""
    );
  }
}

/**
 * Type-ahead search over individual accounts, matching either the handle
 * (`account_id`) or the display name. With `memberOf`, the service accounts
 * that account owns are offered too. Returns only the public identity fields
 * already shown on every profile page. Requires a session so it isn't an open
 * directory-scraping endpoint.
 */
export async function searchAccounts(
  query: string,
  memberOf?: string
): Promise<AccountSuggestion[]> {
  const session = await getPageSession();
  if (!session?.identity_id) return [];
  if (query.trim().length < 2) return [];

  // An account's service accounts are visible only to whoever may grant them
  // access; to anyone else this is an ordinary search of people.
  const mayInvite =
    memberOf !== undefined &&
    isAuthorized(
      session,
      { membership_account_id: memberOf },
      Actions.InviteMembership
    );
  return accountsTable.searchMemberCandidates(
    query,
    mayInvite ? memberOf : undefined
  );
}
