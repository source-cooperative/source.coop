/**
 * @openapi
 * /memberships/{membership_id}/update-role:
 *   put:
 *     tags: [Memberships]
 *     summary: Update membership role.
 *     description: >
 *       Updates the role of a membership for the specified membership.
 *       The user must be authorized to update the membership role.
 *     parameters:
 *       - in: path
 *         name: membership_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the membership to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [owners, maintainers, members]
 *                 description: The new role for the membership
 *     responses:
 *       200:
 *         description: Successfully updated membership role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Membership'
 *       400:
 *         description: Bad Request - Invalid role or membership is not active
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
import { getApiSession } from "@/lib/api/utils";
import { membershipsTable } from "@/lib/clients/database";
import { isAuthorized } from "@/lib/api/authz";

export async function PUT(
  request: NextRequest,
  { params }: { params: { membership_id: string } }
) {
  try {
    const session = await getApiSession(request);
    const { membership_id } = params;
    const { role } = await request.json();
    const membership = await membershipsTable.fetchById(membership_id);
    if (!membership) {
      return NextResponse.json(
        { error: `Membership with ID ${membership_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, membership, Actions.UpdateMembershipRole)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    if (membership.state !== MembershipState.Member) {
      return NextResponse.json(
        { error: `Membership with ID ${membership_id} is not active` },
        { status: StatusCodes.BAD_REQUEST }
      );
    }
    if (!["owners", "maintainers", "members"].includes(role)) {
      return NextResponse.json(
        { error: `Invalid role: ${role}` },
        { status: StatusCodes.BAD_REQUEST }
      );
    }
    return NextResponse.json(
      await membershipsTable.update({
        ...membership,
        role: role,
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
