"use server";

import { getTranslations } from "next-intl/server";
import { LOGGER } from "@/lib/logging";
import {
  Actions,
  Membership,
  MembershipInvitation,
  MembershipInvitationSchema,
  MembershipRole,
  MembershipState,
  AccountType,
  isServiceAccount,
} from "@/types";
import { isAuthorized } from "../api/authz";
import { serviceAccountGrantProblem } from "@/lib/accounts/service-accounts";
import { getPageSession } from "../api/utils";
import { accountsTable, membershipsTable } from "../clients";
import { FormState } from "@/components/core/DynamicForm";
import { revalidatePath } from "next/cache";
import { editAccountProfileUrl } from "@/lib/urls";
import { randomUUID } from "crypto";

/**
 * Invites a new member to an organization.
 *
 * @param initialState - The initial state of the form.
 * @param formData - The form data containing the invitation details.
 */
export async function inviteMember(
  _initialState: any,
  formData: FormData
): Promise<FormState<any>> {
  const t = await getTranslations("MembershipActions");
  const session = await getPageSession();

  if (!session?.identity_id) {
    return {
      fieldErrors: {},
      data: formData,
      message: t("unauthenticated"),
      success: false,
    };
  }

  const organizationId = formData.get("organization_id") as string;
  const productId = formData.get("product_id") as string;
  const accountId = formData.get("account_id") as string;
  const role = formData.get("role") as MembershipRole;

  if (!organizationId || !accountId || !role) {
    return {
      fieldErrors: {},
      data: formData,
      message: t("missingFields"),
      success: false,
    };
  }

  try {
    // Get the organization account
    const organization = await accountsTable.fetchById(organizationId);
    if (!organization) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("organizationNotFound"),
        success: false,
      };
    }

    // Get the account to invite
    const invitedAccount = await accountsTable.fetchById(accountId);
    if (!invitedAccount) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("inviteeNotFound"),
        success: false,
      };
    }

    if (invitedAccount.type === AccountType.ORGANIZATION) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("organizationsCannotBeMembers"),
        success: false,
      };
    }

    const grantProblem = serviceAccountGrantProblem(
      invitedAccount,
      { membership_account_id: organizationId, repository_id: productId },
      role
    );
    if (grantProblem) {
      return {
        fieldErrors: {},
        data: formData,
        message: grantProblem,
        success: false,
      };
    }

    // Create membership invitation
    const membershipInvitation: MembershipInvitation = {
      account_id: accountId,
      role: role as MembershipRole,
    };

    // Validate the invitation
    const validatedInvitation =
      MembershipInvitationSchema.parse(membershipInvitation);

    // Create the membership object
    const membership: Membership = {
      ...validatedInvitation,
      membership_id: randomUUID(),
      membership_account_id: organizationId,
      repository_id: productId,
      // Its owner grants a service account access directly — nobody is at
      // the keyboard to accept an invitation.
      state:
        isServiceAccount(invitedAccount)
          ? MembershipState.Member
          : MembershipState.Invited,
      state_changed: new Date().toISOString(),
    };

    // Check authorization
    if (!isAuthorized(session, membership, Actions.InviteMembership)) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("unauthorizedInvite"),
        success: false,
      };
    }

    // Check if user is already a member or has pending invitation
    const existingMemberships = await membershipsTable.listByAccount(
      organizationId,
      productId
    );
    const existingMembership = existingMemberships.find(
      (m) =>
        m.account_id === accountId &&
        [MembershipState.Member, MembershipState.Invited].includes(m.state)
    );

    if (existingMembership) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("alreadyMember"),
        success: false,
      };
    }

    // Create the membership
    await membershipsTable.create(membership);

    LOGGER.info("Successfully invited member", {
      operation: "inviteMember",
      context: "membership invitation",
      metadata: { organizationId, accountId, role },
    });

    // Revalidate the memberships page
    revalidatePath(editAccountProfileUrl(organizationId));

    return {
      fieldErrors: {},
      data: formData,
      message: t("invited"),
      success: true,
    };
  } catch (error) {
    LOGGER.error("Error inviting member", {
      operation: "inviteMember",
      context: "membership invitation",
      error: error,
    });

    return {
      fieldErrors: {},
      data: formData,
      message: t("inviteFailed"),
      success: false,
    };
  }
}

/**
 * Accepts a membership invitation.
 *
 * @param membershipId - The membership ID to accept.
 * @returns Result indicating success or failure
 */
export async function acceptInvitation(
  membershipId: string
): Promise<{ success: boolean; error?: string }> {
  const t = await getTranslations("MembershipActions");
  const session = await getPageSession();

  if (!session?.identity_id) {
    return { success: false, error: t("unauthenticated") };
  }

  try {
    const membership = await membershipsTable.fetchById(membershipId);
    if (!membership) {
      return { success: false, error: t("membershipNotFound") };
    }

    if (!isAuthorized(session, membership, Actions.AcceptMembership)) {
      return { success: false, error: t("unauthorizedAccept") };
    }

    if (
      membership.state === MembershipState.Member ||
      membership.state === MembershipState.Revoked
    ) {
      return { success: false, error: t("notPending") };
    }

    await membershipsTable.update({
      ...membership,
      state: MembershipState.Member,
      state_changed: new Date().toISOString(),
    });

    LOGGER.info("Successfully accepted invitation", {
      operation: "acceptInvitation",
      context: "membership acceptance",
      metadata: { membershipId },
    });

    // Revalidate relevant paths
    revalidatePath(editAccountProfileUrl(membership.membership_account_id));

    return { success: true };
  } catch (error) {
    LOGGER.error("Error accepting invitation", {
      operation: "acceptInvitation",
      context: "membership acceptance",
      error: error,
    });

    return { success: false, error: t("acceptFailed") };
  }
}

/**
 * Rejects a membership invitation.
 *
 * @param membershipId - The membership ID to reject.
 * @returns Result indicating success or failure
 */
export async function rejectInvitation(
  membershipId: string
): Promise<{ success: boolean; error?: string }> {
  const t = await getTranslations("MembershipActions");
  const session = await getPageSession();

  if (!session?.identity_id) {
    return { success: false, error: t("unauthenticated") };
  }

  try {
    const membership = await membershipsTable.fetchById(membershipId);
    if (!membership) {
      return { success: false, error: t("membershipNotFound") };
    }

    if (!isAuthorized(session, membership, Actions.RejectMembership)) {
      return { success: false, error: t("unauthorizedReject") };
    }

    if (
      membership.state === MembershipState.Member ||
      membership.state === MembershipState.Revoked
    ) {
      return { success: false, error: t("notPending") };
    }

    await membershipsTable.update({
      ...membership,
      state: MembershipState.Revoked,
      state_changed: new Date().toISOString(),
    });

    LOGGER.info("Successfully rejected invitation", {
      operation: "rejectInvitation",
      context: "membership rejection",
      metadata: { membershipId },
    });

    // Revalidate relevant paths
    revalidatePath(editAccountProfileUrl(membership.membership_account_id));

    return { success: true };
  } catch (error) {
    LOGGER.error("Error rejecting invitation", {
      operation: "rejectInvitation",
      context: "membership rejection",
      error: error,
    });

    return { success: false, error: t("rejectFailed") };
  }
}

/**
 * Fetches pending invitations for a specific scope (organization or product)
 *
 * @param membershipAccountId - The organization account ID
 * @param repositoryId - Optional product ID
 * @returns List of pending invitations
 */
export async function getPendingInvitation(
  membershipAccountId: string,
  repositoryId?: string
): Promise<Membership | null> {
  const session = await getPageSession();

  if (!session?.account?.account_id) {
    return null;
  }

  try {
    // Get all memberships for the current user
    const userMemberships = await membershipsTable.listByUser(
      session.account.account_id
    );

    // Filter for pending invitations matching the scope
    const pendingInvitation = userMemberships.find(
      (m) =>
        m.state === MembershipState.Invited &&
        m.membership_account_id === membershipAccountId &&
        (repositoryId ? m.repository_id === repositoryId : !m.repository_id)
    );

    return pendingInvitation || null;
  } catch (error) {
    LOGGER.error("Error fetching pending invitation", {
      operation: "getPendingInvitation",
      context: "invitation retrieval",
      error: error,
    });
    return null;
  }
}

/**
 * Revokes a member's access to an organization.
 *
 * @param _initialState - The initial state of the form.
 * @param formData - The form data containing the membership to revoke.
 */
export async function revokeMembership(
  _initialState: any,
  formData: FormData
): Promise<FormState<any>> {
  const t = await getTranslations("MembershipActions");
  const session = await getPageSession();

  if (!session?.identity_id) {
    return {
      fieldErrors: {},
      data: formData,
      message: t("unauthenticated"),
      success: false,
    };
  }

  const membershipId = formData.get("membership_id") as string;

  if (!membershipId) {
    return {
      fieldErrors: {},
      data: formData,
      message: t("missingMembershipId"),
      success: false,
    };
  }

  try {
    // Get the existing membership
    const existingMembership = await membershipsTable.fetchById(membershipId);
    if (!existingMembership) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("membershipNotFound"),
        success: false,
      };
    }

    // Check authorization
    if (!isAuthorized(session, existingMembership, Actions.RevokeMembership)) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("unauthorizedRevoke"),
        success: false,
      };
    }

    // Update the membership state to revoked
    const updatedMembership = {
      ...existingMembership,
      state: MembershipState.Revoked,
      state_changed: new Date().toISOString(),
    };

    await membershipsTable.update(updatedMembership);

    LOGGER.info("Successfully revoked membership", {
      operation: "revokeMembership",
      context: "membership revocation",
      metadata: { membershipId },
    });

    // Revalidate the memberships page
    revalidatePath(
      editAccountProfileUrl(existingMembership.membership_account_id)
    );

    return {
      fieldErrors: {},
      data: formData,
      message: t("revoked"),
      success: true,
    };
  } catch (error) {
    LOGGER.error("Error revoking membership", {
      operation: "revokeMembership",
      context: "membership revocation",
      error: error,
    });

    return {
      fieldErrors: {},
      data: formData,
      message: t("revokeFailed"),
      success: false,
    };
  }
}
