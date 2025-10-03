"use server";

import { LOGGER } from "@/lib/logging";
import {
  AccountCreationRequestSchema,
  Actions,
  AccountCreationRequest,
  DEFAULT_INDIVIDUAL_FLAGS,
  DEFAULT_ORGANIZATION_FLAGS,
  MembershipRole,
  MembershipState,
  AccountType,
  OrganizationCreationRequestSchema,
  OrganizationCreationRequest,
  IndividualAccount,
  OrganizationalAccount,
  AccountFlags,
  AccountFlagsSchema,
} from "@/types";
import { isAuthorized } from "../api/authz";
import { getPageSession } from "../api/utils";
import { accountsTable, membershipsTable } from "../clients";
import { FormState } from "@/components/core/DynamicForm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { accountUrl, editAccountProfileUrl } from "@/lib/urls";
import { v4 as uuidv4 } from "uuid";

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

  // Create account
  const account = await accountsTable.create(newAccount);
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
      membership_id: uuidv4(),
      membership_account_id: account.account_id,
    });
  }

  redirect(
    account.type === AccountType.INDIVIDUAL
      ? accountUrl(account.account_id, "welcome=true")
      : accountUrl(account.account_id)
  );
}

/**
 * Updates an existing account profile.
 *
 * @param initialState - The initial state of the form.
 * @param formData - The form data containing the account updates.
 */
export async function updateAccountProfile(
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

  const accountId = formData.get("account_id") as string;
  if (!accountId) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Account ID is required",
      success: false,
    };
  }

  try {
    // Get the current account
    const currentAccount = await accountsTable.fetchById(accountId);
    if (!currentAccount) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Account not found",
        success: false,
      };
    }

    // Check authorization
    if (!isAuthorized(session, currentAccount, Actions.PutAccountProfile)) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Unauthorized to update this account",
        success: false,
      };
    }

    // Extract and process form data
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const orcid = formData.get("orcid") as string;

    // Extract websites from form data (handle both indexed and direct approaches)
    const websites: string[] = [];
    for (const [key, value] of formData.entries()) {
      if (
        key.startsWith("websites_") &&
        typeof value === "string" &&
        value.trim()
      ) {
        websites.push(value);
      }
    }

    // Process websites: add https:// prefix if needed and filter out empty ones
    const validWebsites = websites
      .filter((url) => url && url.trim() !== "")
      .map((url) => {
        let processedUrl = url;
        if (
          !processedUrl.startsWith("http://") &&
          !processedUrl.startsWith("https://")
        ) {
          processedUrl = `https://${processedUrl}`;
        }
        return {
          domain: new URL(processedUrl).hostname,
          status: "unverified" as const,
          created_at: new Date().toISOString(),
        };
      });

    // Build update data
    const updateData = {
      ...currentAccount,
      name,
      metadata_public: {
        ...currentAccount.metadata_public,
        bio: description || undefined,
        orcid: orcid || undefined,
        domains: validWebsites,
      },
      updated_at: new Date().toISOString(),
    };

    // Update the account
    await accountsTable.update(updateData);

    LOGGER.info("Successfully updated account profile", {
      operation: "updateAccountProfile",
      context: "profile update",
      metadata: { account_id: accountId },
    });

    // Revalidate the profile page to show updated data
    revalidatePath(accountUrl(accountId));
    revalidatePath(editAccountProfileUrl(accountId));

    return {
      fieldErrors: {},
      data: formData,
      message: "Profile updated successfully!",
      success: true,
    };
  } catch (error) {
    LOGGER.error("Error updating account profile", {
      operation: "updateAccountProfile",
      context: "profile update",
      error: error,
    });

    return {
      fieldErrors: {},
      data: formData,
      message: "Failed to update profile. Please try again.",
      success: false,
    };
  }
}

/**
 * Updates an account's flags.
 *
 * @param initialState - The initial state of the form.
 * @param formData - The form data containing the flags to update.
 */
export async function updateAccountFlags(
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

  const accountId = formData.get("account_id") as string;
  if (!accountId) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Account ID is required",
      success: false,
    };
  }

  try {
    // Get the current account
    const currentAccount = await accountsTable.fetchById(accountId);
    if (!currentAccount) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Account not found",
        success: false,
      };
    }

    // Check authorization
    if (!isAuthorized(session, currentAccount, Actions.PutAccountFlags)) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Unauthorized to update this account's flags",
        success: false,
      };
    }

    // Extract flags from form data
    const flags: AccountFlags[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("flag_") && value === "on") {
        const flagValue = key.replace("flag_", "") as AccountFlags;
        if (Object.values(AccountFlags).includes(flagValue)) {
          flags.push(flagValue);
        }
      }
    }

    // Validate flags
    const validatedFlags = AccountFlagsSchema.parse(flags);

    // Build update data
    const updateData = {
      ...currentAccount,
      flags: validatedFlags,
      updated_at: new Date().toISOString(),
    };

    // Update the account
    await accountsTable.update(updateData);

    LOGGER.info("Successfully updated account flags", {
      operation: "updateAccountFlags",
      context: "flags update",
      metadata: { account_id: accountId, flags: validatedFlags },
    });

    // Revalidate the permissions page to show updated data
    revalidatePath(editAccountProfileUrl(accountId));

    return {
      fieldErrors: {},
      data: formData,
      message: "Account flags updated successfully!",
      success: true,
    };
  } catch (error) {
    LOGGER.error("Error updating account flags", {
      operation: "updateAccountFlags",
      context: "flags update",
      error: error,
    });

    return {
      fieldErrors: {},
      data: formData,
      message: "Failed to update account flags. Please try again.",
      success: false,
    };
  }
}
