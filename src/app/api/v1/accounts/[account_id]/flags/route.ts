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
import { NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { AccountFlags, AccountFlagsSchema, Actions } from "@/api/types";
import { StatusCodes } from "http-status-codes";
import { NotFoundError, UnauthorizedError } from "@/api/errors";
import { getAccount, putAccount } from "@/api/db";
import { isAuthorized } from "@/api/authz";

export async function GET(
  request: Request,
  { params }: { params: { account_id: string } }
) {
  try {
    const { account_id } = params;
    const session = await getServerSession();
    const account = await getAccount(account_id);
    if (!account) {
      return NextResponse.json(
        { error: `Account ${account_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, account, Actions.GetAccountFlags)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    return NextResponse.json(account.flags, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
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
export async function PUT(
  request: Request,
  { params }: { params: { account_id: string } }
) {
  try {
    const { account_id } = params;
    const session = await getServerSession();
    const flagsRequest = AccountFlagsSchema.parse(await request.json());
    var updateFlagsAccount = await getAccount(account_id);
    if (!updateFlagsAccount) {
      return NextResponse.json(
        { error: `Account ${account_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, updateFlagsAccount, Actions.PutAccountFlags)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    updateFlagsAccount.flags = flagsRequest;
    const [account, _success] = await putAccount(updateFlagsAccount);
    return NextResponse.json(account.flags, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
