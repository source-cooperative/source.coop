"use server";

import { z } from "zod";
import { LOGGER } from "@/lib/logging";
import { isAdmin } from "../api/authz";
import { getOryIdentityIdByEmail, getPageSession } from "../api/utils";
import { accountsTable } from "../clients";
import { FormState } from "@/components/core/DynamicForm";
import { accountUrl } from "@/lib/urls";

const LookupSchema = z.object({
  query: z.string().trim().min(1, "Enter a name, username, or email address"),
});

/**
 * Admin-only action: resolves a user to their profile page. An email is looked
 * up in Ory; anything else is treated as an account handle — which is what the
 * field's type-ahead fills in. Returns a `redirectTo` pointing at the profile,
 * or reports that nothing matched.
 *
 * @param initialState - The initial form state.
 * @param formData - The submitted form data containing the `query` field.
 */
export async function lookupUser(
  initialState: any,
  formData: FormData
): Promise<FormState<any>> {
  const session = await getPageSession();

  if (!isAdmin(session)) {
    return failure(formData, "Unauthorized");
  }

  const parsed = LookupSchema.safeParse({ query: formData.get("query") });
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      data: formData,
      message: "Please correct the errors below",
      success: false,
    };
  }

  const { query } = parsed.data;
  let accountId: string;

  if (query.includes("@")) {
    const identityId = await getOryIdentityIdByEmail(query);
    if (!identityId) {
      return failure(formData, `No user found in Ory for ${query}`);
    }

    const account = await accountsTable.fetchByOryId(identityId);
    if (!account) {
      // The identity exists in Ory but has no corresponding source.coop profile.
      return failure(
        formData,
        `${query} exists in Ory but has no source.coop profile`
      );
    }
    accountId = account.account_id;
  } else {
    const account = await accountsTable.fetchById(query.toLowerCase());
    if (account) {
      accountId = account.account_id;
    } else {
      const suggestions = await accountsTable.searchIndividuals(query);
      if (suggestions.length > 1) {
        return failure(
          formData,
          `Multiple accounts match "${query}" — select one from the dropdown`
        );
      }
      if (suggestions.length === 0) {
        return failure(formData, `No account found for ${query}`);
      }
      accountId = suggestions[0].account_id;
    }
  }

  LOGGER.info("Admin resolved a user to their profile", {
    operation: "lookupUser",
    context: "admin",
    metadata: {
      account_id: accountId,
      looked_up_by: session?.account?.account_id,
    },
  });

  // Navigate on the client (see FormState.redirectTo) rather than redirect()
  // here, consistent with the rest of the form actions in this codebase.
  return {
    fieldErrors: {},
    data: formData,
    message: "",
    success: true,
    redirectTo: accountUrl(accountId),
  };
}

function failure(data: FormData, message: string): FormState<any> {
  return { fieldErrors: {}, data, message, success: false };
}
