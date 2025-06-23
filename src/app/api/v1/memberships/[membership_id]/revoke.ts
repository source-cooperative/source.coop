// Import necessary modules and types
import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/api/utils";
import { Actions, Membership, MembershipState } from "@/api/types";
import { withErrorHandling } from "@/api/middleware";
import { StatusCodes } from "http-status-codes";
import {
  MethodNotImplementedError,
  NotFoundError,
  UnauthorizedError,
  BadRequestError,
} from "@/api/errors";
import { getMembership, putMembership } from "@/api/db";
import { isAuthorized } from "@/api/authz";

/**
 * @openapi
 * /memberships/{membership_id}/revoke:
 *   post:
 *     tags: [Memberships]
 *     summary: Revokes a membership.
 *     description: >
 *       Revokes the specified membership.
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
async function revokeMembershipHandler(
  req: NextApiRequest,
  res: NextApiResponse<Membership>
): Promise<void> {
  // Get the current session and membership ID
  const session = await getSession(req);
  const { membership_id } = req.query;

  // Fetch the membership
  const membership = await getMembership(membership_id as string);

  if (!membership) {
    throw new NotFoundError(`Membership with ID ${membership_id} not found`);
  }

  // Check if the user is authorized to accept the membership
  if (!isAuthorized(session, membership, Actions.RevokeMembership)) {
    throw new UnauthorizedError();
  }

  if (membership.state === MembershipState.Revoked) {
    throw new BadRequestError(
      `Membership with ID ${membership_id} is already revoked`
    );
  }

  // Update membership state
  const updatedMembership: Membership = {
    ...membership,
    state: MembershipState.Revoked,
    state_changed: new Date().toISOString(),
  };

  // Save updated membership
  await putMembership(updatedMembership);

  res.status(StatusCodes.OK).json(updatedMembership);
}

// Handler function for the API route
export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Membership>
) {
  // Check if the request method is POST
  if (req.method === "POST") {
    return revokeMembershipHandler(req, res);
  }

  // If the method is not POST, throw an error
  throw new MethodNotImplementedError();
}

// Export the handler with error handling middleware
export default withErrorHandling(handler);
