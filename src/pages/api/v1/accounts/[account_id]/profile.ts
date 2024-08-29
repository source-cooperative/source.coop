// Import necessary modules and types
import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/api/utils";
import { AccountProfile, AccountProfileSchema, Actions } from "@/api/types";
import { withErrorHandling } from "@/api/middleware";
import { StatusCodes } from "http-status-codes";
import {
  MethodNotImplementedError,
  NotFoundError,
  UnauthorizedError,
} from "@/api/errors";
import { getAccount, putAccount } from "@/api/db";
import { isAuthorized } from "@/api/authz";

/**
 * @openapi
 * /api/v1/accounts/{account_id}/profile:
 *   get:
 *     tags: [Accounts]
 *     summary: Get account profile
 *     description: Retrieves the profile of a specific account. Requires appropriate permissions.
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
  req: NextApiRequest,
  res: NextApiResponse<AccountProfile>
): Promise<void> {
  // Extract account_id from request query
  const { account_id } = req.query;
  // Get user session
  const session = await getSession(req);

  // Fetch account from database
  const account = await getAccount(account_id as string);
  // If account not found, throw NotFoundError
  if (!account) {
    throw new NotFoundError(`Account ${account_id} not found`);
  }

  // Check if user is authorized to get account profile
  if (!isAuthorized(session, account, Actions.GetAccountProfile)) {
    throw new UnauthorizedError();
  }

  // Send successful response with account profile
  res.status(StatusCodes.OK).json(account.profile);
}

/**
 * @openapi
 * /api/v1/accounts/{account_id}/profile:
 *   put:
 *     tags: [Accounts]
 *     summary: Update account profile
 *     description: Updates the profile of a specific account. Requires appropriate permissions.
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
  req: NextApiRequest,
  res: NextApiResponse<AccountProfile>
): Promise<void> {
  // Extract account_id from request query
  const { account_id } = req.query;
  // Get user session
  const session = await getSession(req);

  // Parse and validate the account profile update request
  const profileRequest = AccountProfileSchema.parse(req.body);

  // Fetch account to be updated from database
  var updateProfileAccount = await getAccount(account_id as string);
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
  const [account, _success] = await putAccount(updateProfileAccount);

  // Send successful response with updated account profile
  res.status(StatusCodes.OK).json(account.profile);
}

// Main handler function for the API endpoint
export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccountProfile>
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
