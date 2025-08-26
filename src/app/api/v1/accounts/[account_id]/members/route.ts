import { NextRequest, NextResponse } from "next/server";
import {
  Actions,
  Membership,
  MembershipInvitation,
  MembershipInvitationSchema,
  MembershipState,
} from "@/types";
import { AccountType } from "@/types/account";
import { StatusCodes } from "http-status-codes";
import { accountsTable, membershipsTable } from "@/lib/clients/database";
import { isAuthorized } from "@/lib/api/authz";
import { getApiSession } from "@/lib/api/utils";
import { v4 as uuidv4 } from "uuid";

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
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string }> }
) {
  try {
    const session = await getApiSession(request);
    const { account_id } = await params;
    const membershipInvitation: MembershipInvitation =
      MembershipInvitationSchema.parse(await request.json());
    const account = await accountsTable.fetchById(account_id);
    if (!account) {
      return NextResponse.json(
        { error: `Account with ID ${account_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    const invitedAccount = await accountsTable.fetchById(
      membershipInvitation.account_id
    );
    if (!invitedAccount) {
      return NextResponse.json(
        {
          error: `Invited account with ID ${membershipInvitation.account_id} not found`,
        },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (invitedAccount.type !== AccountType.INDIVIDUAL) {
      return NextResponse.json(
        {
          error: `Invited account with ID ${membershipInvitation.account_id} is not a user account`,
        },
        { status: StatusCodes.BAD_REQUEST }
      );
    }
    let createdMembership: Membership | null = null;
    const success = false;
    const membership: Membership = {
      ...membershipInvitation,
      membership_id: uuidv4(),
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
    const existingMembership = await membershipsTable.listByAccount(
      account.account_id
    );
    for (const existing of existingMembership) {
      if (
        existing.account_id === membership.account_id &&
        [MembershipState.Member, MembershipState.Invited].includes(
          existing.state
        )
      ) {
        return NextResponse.json(
          {
            error: `Account with ID ${membership.account_id} is already a member or has a pending invitation for account with ID ${account.account_id}`,
          },
          { status: StatusCodes.BAD_REQUEST }
        );
      }
    }
    createdMembership = await membershipsTable.create(membership);
    if (success) {
      return NextResponse.json(createdMembership, {
        status: StatusCodes.OK,
      });
    }
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
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
  { params }: { params: Promise<{ account_id: string }> }
) {
  try {
    const session = await getApiSession(request);
    const { account_id } = await params;
    const account = await accountsTable.fetchById(account_id);
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
    const memberships = await membershipsTable.listByAccount(
      account.account_id
    );
    const authorizedMemberships: Membership[] = [];
    for (const membership of memberships) {
      if (isAuthorized(session, membership, Actions.GetMembership)) {
        authorizedMemberships.push(membership);
      }
    }
    return NextResponse.json(authorizedMemberships, { status: StatusCodes.OK });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
