/**
 * @openapi
 * /memberships/{membership_id}/revoke:
 *   post:
 *     tags: [Memberships]
 *     summary: Revoke a membership.
 *     description: >
 *       Revokes a membership for the specified membership.
 *       The user must be authorized to revoke the membership.
 *     parameters:
 *       - in: path
 *         name: membership_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the membership to revoke
 *     responses:
 *       200:
 *         description: Successfully revoked membership
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Membership'
 *       400:
 *         description: Bad Request - Membership is already revoked
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - Membership not found
 *       500:
 *         description: Internal server error
 */
import { NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { Actions, Membership, MembershipState } from "@/api/types";
import { StatusCodes } from "http-status-codes";
import {
  NotFoundError,
  UnauthorizedError,
  BadRequestError,
} from "@/api/errors";
import { getMembership, putMembership } from "@/api/db";
import { isAuthorized } from "@/api/authz";

export async function POST(
  request: Request,
  { params }: { params: { membership_id: string } }
) {
  try {
    const session = await getServerSession();
    const { membership_id } = params;
    const membership = await getMembership(membership_id);
    if (!membership) {
      return NextResponse.json(
        { error: `Membership with ID ${membership_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, membership, Actions.RevokeMembership)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    if (membership.state === MembershipState.Revoked) {
      return NextResponse.json(
        { error: `Membership with ID ${membership_id} is already revoked` },
        { status: StatusCodes.BAD_REQUEST }
      );
    }
    const updatedMembership: Membership = {
      ...membership,
      state: MembershipState.Revoked,
      state_changed: new Date().toISOString(),
    };
    await putMembership(updatedMembership);
    return NextResponse.json(updatedMembership, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
