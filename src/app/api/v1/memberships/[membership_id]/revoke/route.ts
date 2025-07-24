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
import { NextRequest, NextResponse } from "next/server";
import { Actions, MembershipState } from "@/types";
import { StatusCodes } from "http-status-codes";
import { isAuthorized } from "@/lib/api/authz";
import { getApiSession } from "@/lib/api/utils";
import { membershipsTable } from "@/lib/clients/database";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ membership_id: string }> }
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
    return NextResponse.json(
      await membershipsTable.update({
        ...membership,
        state: MembershipState.Revoked,
        state_changed: new Date().toISOString(),
      }),
      { status: StatusCodes.OK }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
