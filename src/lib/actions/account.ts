"use server";

import { updateOryIdentity } from "@/lib/ory";
import { getServerSession } from "@ory/nextjs/app";
import { redirect, RedirectType } from "next/navigation";
import { getOryId } from "@/lib/ory";
import { accountsTable } from "@/lib/clients/database/accounts";
import { Account } from "@/types/account";

/**
 * Server action to record email verification timestamp
 */
export async function recordVerificationTimestamp(identityId: string) {
  try {
    if (!identityId) {
      throw new Error("Missing identity_id parameter");
    }

    console.log("Recording verification timestamp for identity:", identityId);

    // Update the identity metadata with the verification timestamp
    const now = new Date().toISOString();
    await updateOryIdentity(identityId, {
      metadata_public: {
        email_verified_at: now,
      },
    });

    console.log("Successfully recorded verification timestamp");

    return {
      success: true,
      timestamp: now,
    };
  } catch (error) {
    console.error("Error recording verification timestamp:", error);
    throw new Error("Failed to record verification timestamp");
  }
}

export async function getAccountFromSession(): Promise<Account | null> {
  const session = await getServerSession();

  if (!session) {
    return null;
  }

  const oryId = getOryId(session);
  if (!oryId) {
    return null;
  }

  let account = await accountsTable.fetchByOryId(oryId);

  // If we have a session but no account, that means a user is authenticated but we need
  // to redirect to the email verification page so that a user can setup their account.
  if (!account) {
    redirect("/onboarding", RedirectType.replace);
  }

  // If we have an account but no email, we add the email from the session.
  if (account.emails?.length === 0 && session.identity?.traits.email) {
    account.emails = [
      {
        address: session.identity.traits.email,
        verified: false,
        is_primary: true,
        added_at: new Date().toISOString(),
      },
    ];
    try {
      await accountsTable.update(account);
    } catch (error) {
      console.error("Failed to add email to account", error);
    }
  }

  return account;
}
