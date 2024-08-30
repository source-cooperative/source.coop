// Import necessary modules and types
import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/api/utils";
import {
  Actions,
  Membership,
  MembershipInvitation,
  MembershipInvitationSchema,
  MembershipState,
} from "@/api/types";
import { withErrorHandling } from "@/api/middleware";
import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  MethodNotImplementedError,
  NotFoundError,
  UnauthorizedError,
} from "@/api/errors";
import {
  getMemberships,
  getAccount,
  getRepository,
  putMembership,
} from "@/api/db";
import { isAuthorized } from "@/api/authz";

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
async function inviteMemberHandler(
  req: NextApiRequest,
  res: NextApiResponse<Membership>
): Promise<void> {
  // Get the current session and query parameters
  const session = await getSession(req);
  const { account_id, repository_id } = req.query;

  // Parse and validate the membership invitation request
  const membershipInvitation: MembershipInvitation =
    MembershipInvitationSchema.parse(req.body);

  // Fetch the repository
  const repository = await getRepository(
    account_id as string,
    repository_id as string
  );

  if (!repository) {
    throw new NotFoundError(
      `Repository with ID ${account_id}/${repository_id} not found`
    );
  }

  const invitedAccount = await getAccount(membershipInvitation.account_id);
  if (!invitedAccount) {
    throw new NotFoundError(
      `Invited account with ID ${membershipInvitation.account_id} not found`
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
      membership_account_id: repository.account_id,
      repository_id: repository.repository_id,
      state: MembershipState.Invited,
      state_changed: new Date().toISOString(),
    };

    if (!isAuthorized(session, membership, Actions.InviteMembership)) {
      throw new UnauthorizedError();
    }

    const existingMembership = await getMemberships(
      repository.account_id,
      repository.repository_id
    );
    var exists = false;
    for (const existing of existingMembership) {
      if (
        existing.account_id === membership.account_id &&
        (existing.state === MembershipState.Member ||
          existing.state === MembershipState.Invited)
      ) {
        exists = true;
        throw new BadRequestError(
          `Account with ID ${membership.account_id} is already a member or has a pending invitation for repository with ID ${repository.account_id}/${repository.repository_id}`
        );
      }
    }
    if (!exists) {
      [createdMembership, success] = await putMembership(membership, true);

      // Send the created membership as the response
      if (success) {
        res.status(StatusCodes.OK).json(createdMembership);
      }
    }
  } while (!success);
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
async function getMembersHandler(
  req: NextApiRequest,
  res: NextApiResponse<Membership[]>
): Promise<void> {
  // Get the current session and query parameters
  const session = await getSession(req);
  const { account_id, repository_id } = req.query;

  // Fetch the repository
  const repository = await getRepository(
    account_id as string,
    repository_id as string
  );

  if (!repository) {
    throw new NotFoundError(
      `Repository with ID ${account_id}/${repository_id} not found`
    );
  }

  // Check if the user is authorized to list memberships for this repository
  if (!isAuthorized(session, repository, Actions.ListRepositoryMemberships)) {
    throw new UnauthorizedError();
  }

  // Retrieve memberships for the repository
  const memberships = await getMemberships(
    repository.account_id,
    repository.repository_id
  );
  const authorizedMemberships: Membership[] = [];
  for (const membership of memberships) {
    // Check if the user is authorized to view the membership
    if (isAuthorized(session, membership, Actions.GetMembership)) {
      authorizedMemberships.push(membership);
    }
  }

  // Send the list of authorized memberships as the response
  res.status(StatusCodes.OK).json(authorizedMemberships);
}

// Handler function for the API route
export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Membership | Membership[]>
) {
  // Check if the request method is POST or GET
  if (req.method === "POST") {
    return inviteMemberHandler(req, res);
  } else if (req.method === "GET") {
    return getMembersHandler(req, res);
  }

  // If the method is neither POST nor GET, throw an error
  throw new MethodNotImplementedError();
}

// Export the handler with error handling middleware
export default withErrorHandling(handler);
