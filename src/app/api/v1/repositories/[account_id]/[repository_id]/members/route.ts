/**
 * @openapi
 * /repositories/{account_id}/{repository_id}/members:
 *   post:
 *     tags: [Memberships, Repositories]
 *     summary: Invite a new member to a repository.
 *     description: >
 *       Invites a new member to the specified repository.
 *       For user accounts, you must be authenticated as the user account you are inviting the member to.
 *       For organization accounts, you must be authenticated as either an `owners` or `maintainers` member of the organization or repository you are inviting the member to.
 *
 *       Users with the `admin` flag may invite users to any repository.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account that owns the repository
 *       - in: path
 *         name: repository_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the repository to invite the member to
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
 *         description: Not Found - Repository not found
 *       500:
 *         description: Internal server error
 */
import { NextRequest, NextResponse } from "next/server";
import {
  Actions,
  Membership,
  MembershipInvitation,
  MembershipInvitationSchema,
  MembershipState,
} from "@/types";
import { StatusCodes } from "http-status-codes";
import { isAuthorized } from "@/lib/api/authz";
import * as crypto from "crypto";
import { getApiSession } from "@/lib/api/utils";
import {
  accountsTable,
  membershipsTable,
  productsTable,
} from "@/lib/clients/database";

export async function POST(
  request: NextRequest,
  { params }: { params: { account_id: string; repository_id: string } }
) {
  try {
    const session = await getApiSession(request);
    const { account_id, repository_id } = params;
    const membershipInvitation: MembershipInvitation =
      MembershipInvitationSchema.parse(await request.json());
    const product = await productsTable.fetchById(account_id, repository_id);
    if (!product) {
      return NextResponse.json(
        {
          error: `Repository with ID ${account_id}/${repository_id} not found`,
        },
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
    let [createdMembership, success]: [Membership | null, boolean] = [
      null,
      false,
    ];
    do {
      let membership: Membership = {
        ...membershipInvitation,
        membership_id: crypto.randomUUID(),
        membership_account_id: product.account_id,
        repository_id: product.product_id,
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
        product.account_id,
        product.product_id
      );
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
              error: `Account with ID ${membership.account_id} is already a member or has a pending invitation for repository with ID ${product.account_id}/${product.product_id}`,
            },
            { status: StatusCodes.BAD_REQUEST }
          );
        }
      }
      if (!exists) {
        [createdMembership, success] = await membershipsTable.create(
          membership,
          true
        );
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
 * /repositories/{account_id}/{repository_id}/members:
 *   get:
 *     tags: [Memberships, Repositories]
 *     summary: List the memberships for a repository
 *     description: |
 *       Retrieves all memberships associated with the specified repository.
 *       For user accounts, you must be authenticated as the user account you are listing memberships for.
 *       For organization accounts, you must be authenticated as either an `owners` or `maintainers` member for the organization or repository you are listing memberships for.
 *
 *       Users with the `admin` flag may list memberships for any repository.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account that owns the repository
 *       - in: path
 *         name: repository_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the repository to list memberships for
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
 *         description: Not Found - Repository not found
 *       '500':
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { account_id: string; repository_id: string } }
) {
  try {
    const session = await getApiSession(request);
    const { account_id, repository_id } = params;
    const product = await productsTable.fetchById(account_id, repository_id);
    if (!product) {
      return NextResponse.json(
        {
          error: `Repository with ID ${account_id}/${repository_id} not found`,
        },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, product, Actions.ListRepositoryMemberships)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    const memberships = await membershipsTable.listByAccount(
      product.account_id,
      product.product_id
    );
    const authorizedMemberships: Membership[] = [];
    for (const membership of memberships) {
      if (isAuthorized(session, membership, Actions.GetMembership)) {
        authorizedMemberships.push(membership);
      }
    }
    return NextResponse.json(authorizedMemberships, {
      status: StatusCodes.OK,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
