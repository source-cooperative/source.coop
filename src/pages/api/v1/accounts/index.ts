import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/api/utils";
import {
  Account,
  AccountSchema,
  AccountType,
  AccountCreationRequestSchema,
  UserSession,
  AccountFlags,
  Actions,
} from "@/api/types";
import { withErrorHandling } from "@/api/middleware";
import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  MethodNotImplementedError,
  UnauthorizedError,
} from "@/api/errors";
import { getAccount, putAccount } from "@/api/db";
import { isAuthorized } from "@/api/authz";
import logger from "@/utils/logger";

/**
 * @openapi
 * /api/v1/accounts:
 *   post:
 *     tags: [Accounts]
 *     summary: Create a new account
 *     description: Creates a new account. Users can only create one User account. Other account types require appropriate permissions.
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
  const session = await getSession(req);
  if (!session) {
    throw new UnauthorizedError();
  }

  const accountRequest = AccountCreationRequestSchema.parse(req.body);
  const newAccount: Account = {
    ...accountRequest,
    disabled: false,
    flags: [],
    identity_id:
      accountRequest.account_type === AccountType.USER
        ? session.identity_id
        : undefined,
  };

  if (!isAuthorized(session, newAccount, Actions.CreateAccount)) {
    throw new UnauthorizedError();
  }

  const [account, success] = await putAccount(newAccount, true);

  if (!success) {
    throw new BadRequestError(
      `Account with ID ${account.account_id} already exists`
    );
  }

  res.status(StatusCodes.OK).json(account);
}

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Account>
) {
  if (req.method === "POST") {
    return createAccountHandler(req, res);
  }

  throw new MethodNotImplementedError();
}

export default withErrorHandling(handler);
