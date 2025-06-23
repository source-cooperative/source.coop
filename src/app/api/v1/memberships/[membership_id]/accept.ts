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
 * /memberships/{membership_id}/accept:
 *   post:
 *     tags: [Memberships]
 *     summary: Accept a membership invitation.
 *     description: >
 *       Accepts a membership invitation for the specified membership.
 *       The user must be authorized to accept the membership.
 *     parameters:
 *       - in: path
 *         name: membership_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the membership to accept
 *     responses:
 *       200:
 *         description: Successfully accepted membership
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
async function acceptMembershipHandler(
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
  if (!isAuthorized(session, membership, Actions.AcceptMembership)) {
    throw new UnauthorizedError();
  }

  if (
    membership.state === MembershipState.Member ||
    membership.state === MembershipState.Revoked
  ) {
    throw new BadRequestError(
      `Membership with ID ${membership_id} is not pending`
    );
  }

  // Update membership state
  const updatedMembership: Membership = {
    ...membership,
    state: MembershipState.Member,
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
    return acceptMembershipHandler(req, res);
  }

  // If the method is not POST, throw an error
  throw new MethodNotImplementedError();
}

// Export the handler with error handling middleware
export default withErrorHandling(handler);
