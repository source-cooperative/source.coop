// Import necessary modules and types
import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/api/utils";
import {
  Account,
  AccountType,
  AccountCreationRequestSchema,
  Actions,
  AccountFlags,
} from "@/api/types";
import { withErrorHandling } from "@/api/middleware";
import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  MethodNotImplementedError,
  UnauthorizedError,
} from "@/api/errors";
import { putAccount } from "@/api/db";
import { isAuthorized } from "@/api/authz";

const isProd = process.env.NEXT_PUBLIC_IS_PROD === "1";

/**
 * @openapi
 * /accounts:
 *   post:
 *     tags: [Accounts]
 *     summary: Create a new account
 *     description: Creates a new account.
 *       Authenticated users can only create a user account if they do not already have one.
 *       Only users with the `create_organizations` flag may create organization accounts.
 *       Users with the `admin` flag may create any account.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AccountCreationRequest'
 *     responses:
 *       200:
 *         description: Successfully created account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       400:
 *         description: Bad request - Invalid request body or an account with the same ID already exists
 *       401:
 *         description: Unauthorized - No valid session found or user already has an account
 *       500:
 *         description: Internal server error
 */
async function createAccountHandler(
  req: NextApiRequest,
  res: NextApiResponse<Account>
): Promise<void> {
  // Get the current session
  const session = await getSession(req);

  // Parse and validate the account creation request
  const accountRequest = AccountCreationRequestSchema.parse(req.body);

  const flags: AccountFlags[] = isProd
    ? [AccountFlags.CREATE_ORGANIZATIONS]
    : [
        AccountFlags.CREATE_ORGANIZATIONS,
        AccountFlags.CREATE_REPOSITORIES,
        AccountFlags.ADMIN,
      ];

  // Create a new account object
  const newAccount: Account = {
    ...accountRequest,
    disabled: false,
    flags,
    identity_id:
      accountRequest.account_type === AccountType.USER
        ? session?.identity_id
        : "N/A",
  };

  // Check if the user is authorized to create an account
  if (!isAuthorized(session, newAccount, Actions.CreateAccount)) {
    throw new UnauthorizedError();
  }

  // Attempt to create the account in the database
  const [account, success] = await putAccount(newAccount, true);

  // If the account creation was not successful, throw an error
  if (!success) {
    throw new BadRequestError(
      `Account with ID ${account.account_id} already exists`
    );
  }

  // Send the created account as the response
  res.status(StatusCodes.OK).json(account);
}

// Handler function for the API route
export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Account>
) {
  // Check if the request method is POST
  if (req.method === "POST") {
    return createAccountHandler(req, res);
  }

  // If the method is not POST, throw an error
  throw new MethodNotImplementedError();
}

// Export the handler with error handling middleware
export default withErrorHandling(handler);
