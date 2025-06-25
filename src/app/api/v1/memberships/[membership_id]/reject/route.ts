/**
 * @openapi
 * /memberships/{membership_id}/reject:
 *   post:
 *     tags: [Memberships]
 *     summary: Reject a membership invitation.
 *     description: >
 *       Rejects a membership invitation for the specified membership.
 *       The user must be authorized to reject the membership.
 *     parameters:
 *       - in: path
 *         name: membership_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the membership to reject
 *     responses:
 *       200:
 *         description: Successfully rejected membership
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Membership'
 *       400:
 *         description: Bad Request - Membership is not in a pending state
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - Membership not found
 *       500:
 *         description: Internal server error
 */
import { NextRequest, NextResponse } from "next/server";
import { Actions, Membership, MembershipState } from "@/types";
import { StatusCodes } from "http-status-codes";
import { membershipsTable } from "@/lib/clients/database";
import { isAuthorized } from "@/lib/api/authz";
import { getApiSession } from "@/lib/api/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: { membership_id: string } }
) {
  try {
    const session = await getApiSession(request);
    const { membership_id } = params;
    const membership = await membershipsTable.fetchById(membership_id);
    if (!membership) {
      return NextResponse.json(
        { error: `Membership with ID ${membership_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, membership, Actions.RejectMembership)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    if (
      membership.state === MembershipState.Member ||
      membership.state === MembershipState.Revoked
    ) {
      return NextResponse.json(
        { error: `Membership with ID ${membership_id} is not pending` },
        { status: StatusCodes.BAD_REQUEST }
      );
    }
    return NextResponse.json(
      await membershipsTable.update({
        ...membership,
        state: MembershipState.Revoked,
        state_changed: new Date().toISOString(),
      }),
      { status: StatusCodes.OK }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
