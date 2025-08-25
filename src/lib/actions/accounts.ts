"use server";

import { redirect } from "next/navigation";
import {
  Account,
  AccountCreationRequestSchema,
  Actions,
  AccountFlags,
  AccountType,
  AccountTypeSchema,
} from "@/types";
import { isAuthorized } from "@/lib/api/authz";
import { accountsTable } from "@/lib/clients/database";
import { getOryId, LOGGER } from "@/lib";
import { getServerSession } from "@ory/nextjs/app";

export async function createAccount(formData: FormData) {
  try {
    // Extract data from FormData
    const account_id = formData.get("account_id") as string;
    const account_type = AccountTypeSchema.parse(formData.get("account_type"));

    if (!account_id || !account_type) {
      throw new Error("Missing required fields: account_id and account_type");
    }

    // Create account request object

    // Validate the request
    const validatedRequest = AccountCreationRequestSchema.parse({
      account_id: account_id,
      account_type: account_type,
    });

    const newAccount: Account = {
      ...validatedRequest,
      name: validatedRequest.account_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      disabled: false,
      flags: [AccountFlags.CREATE_ORGANIZATIONS],
      metadata_private: {},
      identity_id: getOryId(session)!,
    };

    // Check authorization
    if (!isAuthorized(session, newAccount, Actions.CreateAccount)) {
      throw new Error("Unauthorized to create this type of account");
    }

    try {
      const account = await accountsTable.create(newAccount);

      return { success: true, data: account };
    } catch (e) {
      LOGGER.error("Error creating account", {
        operation: "createAccount",
        context: "account creation",
        error: e,
      });
      throw new Error(
        `Account with ID ${newAccount.account_id} already exists`
      );
    }
  } catch (err: any) {
    LOGGER.error("Error in createAccount server action", {
      operation: "createAccount",
      error: err,
    });
    return { success: false, error: err.message || "Internal server error" };
  }
}
