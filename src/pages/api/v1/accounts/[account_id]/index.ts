// Import necessary modules and types
import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/api/utils";
import { Account, Actions } from "@/api/types";
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
 * /accounts/{account_id}:
 *   get:
 *     tags: [Accounts]
 *     summary: Get account details
 *     description: Retrieves the details of a specific account.
 *       For a User account, you must be authenticated as the user you are retrieving the account details for.
 *       For an Organization account, you must be authenticated as either an `owners` or `maintainers` member of the organization you are retrieving the account details for.
 *       Users with the `admin` flag may retrieve the account details for any account.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved account details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - Account with the specified ID does not exist
 *       500:
 *         description: Internal server error
 */
async function getAccountHandler(
  req: NextApiRequest,
  res: NextApiResponse<Account>
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

  // Check if user is authorized to get account details
  if (!isAuthorized(session, account, Actions.GetAccount)) {
    throw new UnauthorizedError();
  }

  // Send successful response with account details
  res.status(StatusCodes.OK).json(account);
}

/**
 * @openapi
 * /accounts/{account_id}:
 *   delete:
 *     tags: [Accounts]
 *     summary: Disable an account
 *     description: Disables a specific account.
 *       User accounts may not be disabled unless you are authenticated as a user with the `admin` flag.
 *       Organization accounts require that you are authenticated as an `owners` or `maintainers` member of the organization.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account to disable
 *     responses:
 *       200:
 *         description: Successfully disabled the account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - Account with the specified ID does not exist
 *       500:
 *         description: Internal server error
 */
async function deleteAccountHandler(
  req: NextApiRequest,
  res: NextApiResponse<Account>
): Promise<void> {
  // Extract account_id from request query
  const { account_id } = req.query;
  // Get user session
  const session = await getSession(req);

  // Fetch account to be disabled from database
  const disableAccount = await getAccount(account_id as string);
  // If account not found, throw NotFoundError
  if (!disableAccount) {
    throw new NotFoundError(`Account ${account_id} not found`);
  }

  // Check if user is authorized to disable the account
  if (!isAuthorized(session, disableAccount, Actions.DisableAccount)) {
    throw new UnauthorizedError();
  }

  // Set account as disabled
  disableAccount.disabled = true;
  // Update the account in the database
  const [account, _success] = await putAccount(disableAccount);

  // Send successful response with updated account details
  res.status(StatusCodes.OK).json(account);
}

// Main handler function for the API endpoint
export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Account>
) {
  // Route request based on HTTP method
  if (req.method === "GET") {
    return getAccountHandler(req, res);
  } else if (req.method === "DELETE") {
    return deleteAccountHandler(req, res);
  }

  // Throw error for unsupported methods
  throw new MethodNotImplementedError();
}

// Export the handler with error handling middleware
export default withErrorHandling(handler);
