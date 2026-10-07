"use server";

import { Membership, MembershipState } from "@/types";
import { LOGGER } from "@/lib/logging";
import { getPageSession } from "../api/utils";
import * as ops from "../operations/memberships";
import { OperationResult, toFormState } from "../operations/result";
import { FormState } from "@/components/core/DynamicForm";
import { revalidatePath } from "next/cache";
import { editAccountProfileUrl } from "@/lib/urls";

function revalidate(result: OperationResult<Membership>) {
  if (result.ok) {
    revalidatePath(editAccountProfileUrl(result.value.membership_account_id));
  }
  return result;
}

/** Invites a member to an organization or one of its products. */
export async function inviteMember(
  _initialState: FormState<Membership>,
  formData: FormData
): Promise<FormState<Membership>> {
  const result = await ops.inviteMember(await getPageSession(), {
    membership_account_id: formData.get("organization_id"),
    // An unset hidden field submits "", which means no product.
    repository_id: formData.get("product_id") || undefined,
    account_id: formData.get("account_id"),
    role: formData.get("role"),
  });
  return toFormState(revalidate(result), formData, "Member invited successfully!");
}

/** Revokes the membership named by the form's `membership_id`. */
export async function revokeMembership(
  _initialState: FormState<Membership>,
  formData: FormData
): Promise<FormState<Membership>> {
  const result = await ops.revokeMembership(
    await getPageSession(),
    String(formData.get("membership_id") ?? "")
  );
  return toFormState(revalidate(result), formData, "Membership revoked successfully!");
}

async function respond(
  op: typeof ops.acceptInvitation,
  membershipId: string
): Promise<{ success: boolean; error?: string }> {
  const result = revalidate(await op(await getPageSession(), membershipId));
  return result.ok ? { success: true } : { success: false, error: result.message };
}

export async function acceptInvitation(membershipId: string) {
  return respond(ops.acceptInvitation, membershipId);
}

export async function rejectInvitation(membershipId: string) {
  return respond(ops.rejectInvitation, membershipId);
}

/**
 * The visitor's pending invitation to an account (or, given `repositoryId`,
 * to one of its products), or null.
 */
export async function getPendingInvitation(
  membershipAccountId: string,
  repositoryId?: string
): Promise<Membership | null> {
  // A banner isn't worth failing the page it sits on.
  const result = await ops
    .listMemberships(await getPageSession(), { state: MembershipState.Invited })
    .catch((error) => {
      LOGGER.error("Error fetching pending invitation", {
        operation: "getPendingInvitation",
        error,
      });
      return null;
    });
  if (!result?.ok) return null;
  return (
    result.value.find(
      (m) =>
        m.membership_account_id === membershipAccountId &&
        (repositoryId ? m.repository_id === repositoryId : !m.repository_id)
    ) ?? null
  );
}
