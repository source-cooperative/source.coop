"use server";

import { updateOryIdentity } from "@/lib/ory";
import { LOGGER } from "@/lib/logging";
import {
  AccountCreationRequestSchema,
  Account,
  Actions,
  AccountCreationRequest,
  DEFAULT_INDIVIDUAL_FLAGS,
  DEFAULT_ORGANIZATION_FLAGS,
  MembershipRole,
  MembershipState,
  AccountType,
  OrganizationCreationRequestSchema,
  OrganizationCreationRequest,
} from "@/types";
import { isAuthorized } from "../api/authz";
import { getPageSession } from "../api/utils";
import { accountsTable, membershipsTable } from "../clients";
import { FormState } from "@/components/core/DynamicForm";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

/**
 * Server action to record email verification timestamp
 */
export async function recordVerificationTimestamp(identityId: string) {
  try {
    if (!identityId) {
      throw new Error("Missing identity_id parameter");
    }

    LOGGER.info("Recording verification timestamp for identity", {
      operation: "recordVerificationTimestamp",
      context: "email verification",
      metadata: { identityId },
    });

    // Update the identity metadata with the verification timestamp
    const now = new Date().toISOString();
    await updateOryIdentity(identityId, {
      metadata_public: {
        email_verified_at: now,
      },
    });

    LOGGER.info("Successfully recorded verification timestamp", {
      operation: "recordVerificationTimestamp",
      context: "email verification",
      metadata: { identityId },
    });

    return {
      success: true,
      timestamp: now,
    };
  } catch (error) {
    LOGGER.error("Error recording verification timestamp", {
      operation: "recordVerificationTimestamp",
      context: "email verification",
      error: error,
    });
    throw new Error("Failed to record verification timestamp");
  }
}

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
  const schema =
    formData.get("type") === AccountType.ORGANIZATION
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
  const newAccount =
    validatedFields.data.type === AccountType.INDIVIDUAL
      ? {
          ...baseAccount,
          identity_id: session?.identity_id,
          flags: DEFAULT_INDIVIDUAL_FLAGS,
        }
      : {
          ...baseAccount,
          identity_id: undefined,
          flags: DEFAULT_ORGANIZATION_FLAGS,
        };

  // Check authorization
  if (!isAuthorized(session, newAccount as Account, Actions.CreateAccount)) {
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

  // Create account
  const account = await accountsTable.create(newAccount as Account);
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

  redirect(
    account.type === AccountType.INDIVIDUAL
      ? `/${account.account_id}?welcome=true`
      : `/${account.account_id}`
  );
}

export async function onboardAccount(formData: FormData): Promise<void> {
  const session = await getPageSession();

  if (!session?.identity_id) throw new Error("Unauthenticated");

  const account_id = formData.get("account_id") as string;
  const name = formData.get("name") as string;
}
