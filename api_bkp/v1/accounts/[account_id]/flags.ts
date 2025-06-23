import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/api/utils";
import { AccountFlags, AccountFlagsSchema, Actions } from "@/api/types";
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
 * /accounts/{account_id}/flags:
 *   get:
 *     tags: [Accounts]
 *     summary: Get account flags
 *     description: Retrieves the flags of a specific account.
 *       For a User account, users may only get the flags for their own account.
 *       For an Organization account, only users who are `owners` or `maintainers` of the organization may get the flags.
 *       Users with the `admin` flag may get the flags for any account.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account whose flags to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved account flags
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountFlags'
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - Account with the specified ID does not exist
 *       500:
 *         description: Internal server error
 */
async function getAccountFlagsHandler(
  req: NextApiRequest,
  res: NextApiResponse<AccountFlags[]>
): Promise<void> {
  const { account_id } = req.query;
  const session = await getSession(req);

  const account = await getAccount(account_id as string);
  if (!account) {
    throw new NotFoundError(`Account ${account_id} not found`);
  }

  if (!isAuthorized(session, account, Actions.GetAccountFlags)) {
    throw new UnauthorizedError();
  }

  res.status(StatusCodes.OK).json(account.flags);
}

/**
 * @openapi
 * /accounts/{account_id}/flags:
 *   put:
 *     tags: [Accounts]
 *     summary: Update account flags
 *     description: Updates the flags of a specific account. You must have the `admin` flag to update the flags for an account.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account whose flags to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AccountFlags'
 *     responses:
 *       200:
 *         description: Successfully updated the account flags
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountFlags'
 *       400:
 *         description: Bad Request - Invalid flags data
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - Account with the specified ID does not exist
 *       500:
 *         description: Internal server error
 */
async function putAccountFlagsHandler(
  req: NextApiRequest,
  res: NextApiResponse<AccountFlags[]>
): Promise<void> {
  const { account_id } = req.query;
  const session = await getSession(req);

  const flagsRequest = AccountFlagsSchema.parse(req.body);

  var updateFlagsAccount = await getAccount(account_id as string);
  if (!updateFlagsAccount) {
    throw new NotFoundError(`Account ${account_id} not found`);
  }

  if (!isAuthorized(session, updateFlagsAccount, Actions.PutAccountFlags)) {
    throw new UnauthorizedError();
  }

  updateFlagsAccount.flags = flagsRequest;

  const [account, _success] = await putAccount(updateFlagsAccount);

  res.status(StatusCodes.OK).json(account.flags);
}

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccountFlags[]>
) {
  if (req.method === "GET") {
    return getAccountFlagsHandler(req, res);
  } else if (req.method === "PUT") {
    return putAccountFlagsHandler(req, res);
  }

  throw new MethodNotImplementedError();
}

export default withErrorHandling(handler);
