/**
 * @openapi
 * /accounts/{account_id}/members:
 *   post:
 *     tags: [Memberships, Accounts]
 *     summary: Invite a new member to an account.
 *     description: >
 *       Invites a new member to the specified account.
 *       For user accounts, you must be authenticated as the user account you are inviting the member to.
 *       For organization accounts, you must be authenticated as either an `owners` or `maintainers` member for the organization account you are inviting the member to.
 *
 *       Only users with the `admin` flag may invite members to service accounts.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account to invite the member to
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MembershipInvitation'
 *     responses:
 *       200:
 *         description: Successfully invited member
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Membership'
 *       400:
 *         description: Bad request - Invalid request body or member already invited/exists
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - Account not found
 *       500:
 *         description: Internal server error
 */
import { NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import {
  Actions,
  Membership,
  MembershipInvitation,
  MembershipInvitationSchema,
  MembershipState,
} from "@/types";
import { AccountType } from "@/types/account";
import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@/lib/api/errors";
import { getAccount, getMemberships, putMembership } from "@/api/db";
import { isAuthorized } from "@/lib/api/authz";
import * as crypto from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: { account_id: string } }
) {
  try {
    const session = await getApiSession(request);
    const { account_id } = params;
    const membershipInvitation: MembershipInvitation =
      MembershipInvitationSchema.parse(await request.json());
    const account = await getAccount(account_id);
    if (!account) {
      return NextResponse.json(
        { error: `Account with ID ${account_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    const invitedAccount = await getAccount(membershipInvitation.account_id);
    if (!invitedAccount) {
      return NextResponse.json(
        {
          error: `Invited account with ID ${membershipInvitation.account_id} not found`,
        },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (invitedAccount.account_type !== AccountType.USER) {
      return NextResponse.json(
        {
          error: `Invited account with ID ${membershipInvitation.account_id} is not a user account`,
        },
        { status: StatusCodes.BAD_REQUEST }
      );
    }
    let [createdMembership, success]: [Membership | null, boolean] = [
      null,
      false,
    ];
    do {
      let membership: Membership = {
        ...membershipInvitation,
        membership_id: crypto.randomUUID(),
        membership_account_id: account.account_id,
        state: MembershipState.Invited,
        state_changed: new Date().toISOString(),
      };
      if (!isAuthorized(session, membership, Actions.InviteMembership)) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: StatusCodes.UNAUTHORIZED }
        );
      }
      const existingMembership = await getMemberships(account.account_id);
      var exists = false;
      for (const existing of existingMembership) {
        if (
          existing.account_id === membership.account_id &&
          (existing.state === MembershipState.Member ||
            existing.state === MembershipState.Invited)
        ) {
          exists = true;
          return NextResponse.json(
            {
              error: `Account with ID ${membership.account_id} is already a member or has a pending invitation for account with ID ${account.account_id}`,
            },
            { status: StatusCodes.BAD_REQUEST }
          );
        }
      }
      if (!exists) {
        [createdMembership, success] = await putMembership(membership, true);
        if (success) {
          return NextResponse.json(createdMembership, {
            status: StatusCodes.OK,
          });
        }
      }
    } while (!success);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * @openapi
 * /accounts/{account_id}/members:
 *   get:
 *     tags: [Memberships, Accounts]
 *     summary: List the memberships for an account
 *     description: |
 *       Retrieves all memberships associated with the specified account.
 *       For user accounts, you must be authenticated as the user account you are listing memberships for.
 *       For organization accounts, you must be authenticated as either an `owners` or `maintainers` member of the organization account you are listing memberships for.
 *
 *       Only users with the `admin` flag may list memberships for service accounts.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account to list memberships for
 *     responses:
 *       '200':
 *         description: Successfully retrieved memberships
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Membership'
 *       '401':
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       '404':
 *         description: Not Found - Account not found
 *       '500':
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { account_id: string } }
) {
  try {
    const session = await getApiSession(request);
    const { account_id } = params;
    const account = await getAccount(account_id);
    if (!account) {
      return NextResponse.json(
        { error: `Account with ID ${account_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, account, Actions.ListAccountMemberships)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    const memberships = await getMemberships(account.account_id);
    const authorizedMemberships: Membership[] = [];
    for (const membership of memberships) {
      if (isAuthorized(session, membership, Actions.GetMembership)) {
        authorizedMemberships.push(membership);
      }
    }
    return NextResponse.json(authorizedMemberships, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
