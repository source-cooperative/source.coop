// Import necessary modules and types
import type { NextRequest, NextResponse } from "next/server";
import { getEmail, getProfileImage, getServerSession } from "@/api/utils";
import {
  AccountProfile,
  AccountProfileResponse,
  AccountProfileSchema,
  Actions,
} from "@/types";
import { withErrorHandling } from "@/lib/api/utils";
import { StatusCodes } from "http-status-codes";
import {
  MethodNotImplementedError,
  NotFoundError,
  UnauthorizedError,
} from "@/lib/api/errors";
import { getAccount, putAccount } from "@/api/db";
import { isAuthorized } from "@/lib/api/authz";

/**
 * @openapi
 * /accounts/{account_id}/profile:
 *   get:
 *     tags: [Accounts]
 *     summary: Get account profile
 *     description: Retrieves the profile of a specific account. Any user, authenticated or not, can retrieve the profile of any account.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account whose profile to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved account profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountProfile'
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - Account with the specified ID does not exist
 *       500:
 *         description: Internal server error
 */
async function getAccountProfileHandler(
  req: NextRequest,
  res: NextResponse<AccountProfileResponse>
): Promise<void> {
  // Extract account_id from request query
  const { account_id } = req.query;
  // Get user session
  const session = await getApiSession(request);

  // Fetch account from database
  const account = await accountsTable.fetchById(account_id as string);
  // If account not found, throw NotFoundError
  if (!account) {
    throw new NotFoundError(`Account ${account_id} not found`);
  }

  // Check if user is authorized to get account profile
  if (!isAuthorized(session, account, Actions.GetAccountProfile)) {
    throw new UnauthorizedError();
  }

  const email = account.identity_id
    ? await getEmail(account.identity_id)
    : null;

  const profile: AccountProfileResponse = {
    ...account.profile,
    profile_image: email ? getProfileImage(email) : undefined,
    account_type: account.account_type,
  };

  // Send successful response with account profile
  res.status(StatusCodes.OK).json(profile);
}

/**
 * @openapi
 * /accounts/{account_id}/profile:
 *   put:
 *     tags: [Accounts]
 *     summary: Update account profile
 *     description: Updates the profile of a specific account.
 *       For a User account, you must be authenticated as the user you are updating the profile for.
 *       For an Organization account, you must be authenticated as an `owners` member of the organization you are updating the profile for.
 *      Users with the `admin` flag may update the profile for any account.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account whose profile to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AccountProfile'
 *     responses:
 *       200:
 *         description: Successfully updated the account profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountProfile'
 *       400:
 *         description: Bad Request - Invalid profile data
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - Account with the specified ID does not exist
 *       500:
 *         description: Internal server error
 */
async function putAccountProfileHandler(
  req: NextRequest,
  res: NextResponse<AccountProfileResponse>
): Promise<void> {
  // Extract account_id from request query
  const { account_id } = req.query;
  // Get user session
  const session = await getApiSession(request);

  // Parse and validate the account profile update request
  const profileRequest = AccountProfileSchema.parse(req.body);

  // Fetch account to be updated from database
  var updateProfileAccount = await accountsTable.fetchById(
    account_id as string
  );
  // If account not found, throw NotFoundError
  if (!updateProfileAccount) {
    throw new NotFoundError(`Account ${account_id} not found`);
  }

  // Check if user is authorized to update the account profile
  if (!isAuthorized(session, updateProfileAccount, Actions.PutAccountProfile)) {
    throw new UnauthorizedError();
  }

  updateProfileAccount.profile = profileRequest;

  // Update the account in the database
  const [account, _success] = await accountsTable.update(updateProfileAccount);

  // Send successful response with updated account profile
  res.status(StatusCodes.OK).json(account.profile);
}

// Main handler function for the API endpoint
export async function handler(
  req: NextRequest,
  res: NextResponse<AccountProfileResponse>
) {
  // Route request based on HTTP method
  if (req.method === "GET") {
    return getAccountProfileHandler(req, res);
  } else if (req.method === "PUT") {
    return putAccountProfileHandler(req, res);
  }

  // Throw error for unsupported methods
  throw new MethodNotImplementedError();
}

// Export the handler with error handling middleware
export default withErrorHandling(handler);
