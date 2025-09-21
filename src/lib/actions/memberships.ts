"use server";

import { LOGGER } from "@/lib/logging";
import {
  Actions,
  Membership,
  MembershipInvitation,
  MembershipInvitationSchema,
  MembershipRole,
  MembershipState,
  AccountType,
} from "@/types";
import { isAuthorized } from "../api/authz";
import { getPageSession } from "../api/utils";
import { accountsTable, membershipsTable } from "../clients";
import { FormState } from "@/components/core/DynamicForm";
import { revalidatePath } from "next/cache";
import { editAccountProfileUrl } from "@/lib/urls";
import { v4 as uuidv4 } from "uuid";

/**
 * Invites a new member to an organization.
 *
 * @param initialState - The initial state of the form.
 * @param formData - The form data containing the invitation details.
 */
export async function inviteMember(
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

  const organizationId = formData.get("organization_id") as string;
  const accountId = formData.get("account_id") as string;
  const role = formData.get("role") as MembershipRole;

  if (!organizationId || !accountId || !role) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Missing required fields",
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
        message: "Organization not found",
        success: false,
      };
    }

    // Get the account to invite
    const invitedAccount = await accountsTable.fetchById(accountId);
    if (!invitedAccount) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Account to invite not found",
        success: false,
      };
    }

    if (invitedAccount.type !== AccountType.INDIVIDUAL) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Can only invite individual accounts",
        success: false,
      };
    }

    // Create membership invitation
    const membershipInvitation: MembershipInvitation = {
      account_id: accountId,
      role: role as MembershipRole,
    };

    // Validate the invitation
    const validatedInvitation = MembershipInvitationSchema.parse(membershipInvitation);

    // Create the membership object
    const membership: Membership = {
      ...validatedInvitation,
      membership_id: uuidv4(),
      membership_account_id: organizationId,
      state: MembershipState.Invited,
      state_changed: new Date().toISOString(),
    };

    // Check authorization
    if (!isAuthorized(session, membership, Actions.InviteMembership)) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Unauthorized to invite members to this organization",
        success: false,
      };
    }

    // Check if user is already a member or has pending invitation
    const existingMemberships = await membershipsTable.listByAccount(organizationId);
    const existingMembership = existingMemberships.find(
      (m) =>
        m.account_id === accountId &&
        [MembershipState.Member, MembershipState.Invited].includes(m.state)
    );

    if (existingMembership) {
      return {
        fieldErrors: {},
        data: formData,
        message: "User is already a member or has a pending invitation",
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
      message: "Member invited successfully!",
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
      message: "Failed to invite member. Please try again.",
      success: false,
    };
  }
}

/**
 * Updates a member's role in an organization.
 *
 * @param initialState - The initial state of the form.
 * @param formData - The form data containing the role update.
 */
export async function updateMemberRole(
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

  const membershipId = formData.get("membership_id") as string;
  const newRole = formData.get("role") as MembershipRole;

  if (!membershipId || !newRole) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Missing required fields",
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
        message: "Membership not found",
        success: false,
      };
    }

    // Check authorization
    if (!isAuthorized(session, existingMembership, Actions.UpdateMembershipRole)) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Unauthorized to update this membership",
        success: false,
      };
    }

    // Update the membership role
    const updatedMembership = {
      ...existingMembership,
      role: newRole as MembershipRole,
      state_changed: new Date().toISOString(),
    };

    await membershipsTable.update(updatedMembership);

    LOGGER.info("Successfully updated member role", {
      operation: "updateMemberRole",
      context: "membership update",
      metadata: { membershipId, newRole },
    });

    // Revalidate the memberships page
    revalidatePath(editAccountProfileUrl(existingMembership.membership_account_id));

    return {
      fieldErrors: {},
      data: formData,
      message: "Member role updated successfully!",
      success: true,
    };
  } catch (error) {
    LOGGER.error("Error updating member role", {
      operation: "updateMemberRole",
      context: "membership update",
      error: error,
    });

    return {
      fieldErrors: {},
      data: formData,
      message: "Failed to update member role. Please try again.",
      success: false,
    };
  }
}

/**
 * Revokes a member's access to an organization.
 *
 * @param initialState - The initial state of the form.
 * @param formData - The form data containing the membership to revoke.
 */
export async function revokeMembership(
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

  const membershipId = formData.get("membership_id") as string;

  if (!membershipId) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Missing membership ID",
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
        message: "Membership not found",
        success: false,
      };
    }

    // Check authorization
    if (!isAuthorized(session, existingMembership, Actions.RevokeMembership)) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Unauthorized to revoke this membership",
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
    revalidatePath(editAccountProfileUrl(existingMembership.membership_account_id));

    return {
      fieldErrors: {},
      data: formData,
      message: "Membership revoked successfully!",
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
      message: "Failed to revoke membership. Please try again.",
      success: false,
    };
  }
}
