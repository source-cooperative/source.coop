import type { NextRequest, NextResponse } from "next/server";
import { AccountFlags, AccountFlagsSchema, Actions } from "@/types";
import { withErrorHandling } from "@/lib/api/utils";
import { StatusCodes } from "http-status-codes";
import {
  MethodNotImplementedError,
  NotFoundError,
  UnauthorizedError,
} from "@/lib/api/errors";
import { isAuthorized } from "@/lib/api/authz";
import { getApiSession } from "@/lib/api/utils";
import { accountsTable } from "@/lib/clients/database";

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
  req: NextRequest,
  res: NextResponse<AccountFlags[]>
): Promise<void> {
  const { account_id } = req.query;
  const session = await getApiSession(request);

  const account = await accountsTable.fetchById(account_id as string);
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
  req: NextRequest,
  res: NextResponse<AccountFlags[]>
): Promise<void> {
  const { account_id } = req.query;
  const session = await getApiSession(request);

  const flagsRequest = AccountFlagsSchema.parse(req.body);

  var updateFlagsAccount = await accountsTable.fetchById(account_id as string);
  if (!updateFlagsAccount) {
    throw new NotFoundError(`Account ${account_id} not found`);
  }

  if (!isAuthorized(session, updateFlagsAccount, Actions.PutAccountFlags)) {
    throw new UnauthorizedError();
  }

  updateFlagsAccount.flags = flagsRequest;

  const [account, _success] = await accountsTable.update(updateFlagsAccount);

  res.status(StatusCodes.OK).json(account.flags);
}

export async function handler(
  req: NextRequest,
  res: NextResponse<AccountFlags[]>
) {
  if (req.method === "GET") {
    return getAccountFlagsHandler(req, res);
  } else if (req.method === "PUT") {
    return putAccountFlagsHandler(req, res);
  }

  throw new MethodNotImplementedError();
}

export default withErrorHandling(handler);
