"use server";

import { LOGGER } from "@/lib/logging";
import { isConditionalCheckFailed } from "@/lib/clients/database/errors";
import {
  Account,
  AccountCreationRequestSchema,
  Actions,
  DEFAULT_INDIVIDUAL_FLAGS,
  AccountType,
  IndividualAccount,
} from "@/types";
import { isAuthorized } from "../api/authz";
import { getPageSession } from "../api/utils";
import { accountsTable } from "../clients";
import type { AccountSuggestion } from "../clients/database/accounts";
import { FormState } from "@/components/core/DynamicForm";
import { accountUrl } from "@/lib/urls";
import * as ops from "@/lib/operations/accounts";
import { OperationResult, toFormState } from "@/lib/operations/result";

/**
 * Creates the signed-in person's own account at onboarding, or, from the
 * new-organization form, an organization through `createOrganization`.
 */
export async function createAccount(
  initialState: any,
  formData: FormData
): Promise<FormState<any>> {
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
  if (type === AccountType.ORGANIZATION) {
    const result = await ops.createOrganization(session, Object.fromEntries(formData));
    return toFormState(result, formData, "", result.ok ? accountUrl(result.value.account_id) : undefined);
  }
  const validatedFields = AccountCreationRequestSchema.safeParse(Object.fromEntries(formData));

  if (!validatedFields.success) {
    return {
      fieldErrors: validatedFields.error.flatten().fieldErrors,
      data: formData,
      message: "Invalid form data",
      success: false,
    };
  }

  const newAccount: Account = {
    type: AccountType.INDIVIDUAL,
    name: validatedFields.data.name,
    account_id: validatedFields.data.account_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    disabled: false,
    metadata_public: {},
    metadata_private: {},
    identity_id: session.identity_id,
    flags: DEFAULT_INDIVIDUAL_FLAGS,
  } as IndividualAccount;

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

  // Navigate on the client (see FormState.redirectTo) rather than redirect()
  // here, so the shared layout's auth UI re-renders and the freshly onboarded
  // user isn't shown as logged out until a full reload.
  return {
    fieldErrors: {},
    data: formData,
    message: "",
    success: true,
    redirectTo: accountUrl(account.account_id, "welcome=true"),
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
    ops.updateAccount(await getPageSession(), account_id, {
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
    ops.updateAccount(await getPageSession(), account_id, {
      flags: [...formData.entries()]
        .filter(([key, value]) => key !== "account_id" && value === "on")
        .map(([key]) => key),
    })
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
 * The account picker's type-ahead; nothing for a query the search refuses. An
 * admin's email search can find a disabled account, which is no one to invite.
 */
export async function searchAccounts(
  query: string,
  memberOf?: string
): Promise<AccountSuggestion[]> {
  const result = await ops.searchAccounts(await getPageSession(), {
    q: query,
    member_of: memberOf,
  });
  return result.ok ? result.value.items.filter((s) => !s.disabled) : [];
}
