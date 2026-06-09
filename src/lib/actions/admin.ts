"use server";

import { z } from "zod";
import { LOGGER } from "@/lib/logging";
import { isAdmin } from "../api/authz";
import { getOryIdentityIdByEmail, getPageSession } from "../api/utils";
import { accountsTable } from "../clients";
import { FormState } from "@/components/core/DynamicForm";
import { accountUrl } from "@/lib/urls";

const LookupSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

/**
 * Admin-only action: looks up an email in Ory and, when a matching user with a
 * source.coop profile exists, returns a `redirectTo` pointing at that user's
 * profile page. Otherwise reports that the email was not found.
 *
 * @param initialState - The initial form state.
 * @param formData - The submitted form data containing the `email` field.
 */
export async function lookupUserByEmail(
  initialState: any,
  formData: FormData
): Promise<FormState<any>> {
  const session = await getPageSession();

  if (!isAdmin(session)) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Unauthorized",
      success: false,
    };
  }

  const parsed = LookupSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      data: formData,
      message: "Please correct the errors below",
      success: false,
    };
  }

  const { email } = parsed.data;

  const identityId = await getOryIdentityIdByEmail(email);
  if (!identityId) {
    return {
      fieldErrors: {},
      data: formData,
      message: `No user found in Ory for ${email}`,
      success: false,
    };
  }

  const account = await accountsTable.fetchByOryId(identityId);
  if (!account) {
    // The identity exists in Ory but has no corresponding source.coop profile.
    return {
      fieldErrors: {},
      data: formData,
      message: `${email} exists in Ory but has no source.coop profile`,
      success: false,
    };
  }

  LOGGER.info("Admin resolved email to profile", {
    operation: "lookupUserByEmail",
    context: "admin",
    metadata: { account_id: account.account_id },
  });

  // Navigate on the client (see FormState.redirectTo) rather than redirect()
  // here, consistent with the rest of the form actions in this codebase.
  return {
    fieldErrors: {},
    data: formData,
    message: "",
    success: true,
    redirectTo: accountUrl(account.account_id),
  };
}
