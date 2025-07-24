import { NextRequest, NextResponse } from "next/server";
import { AccountFlagsSchema, Actions } from "@/types";
import { StatusCodes } from "http-status-codes";
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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string }> }
) {
  try {
    const { account_id } = await params;
    const session = await getApiSession(request);
    const account = session?.account;
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
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
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
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string }> }
) {
  try {
    const session = await getApiSession(request);
    const { account_id } = await params;
    const accountToUpdate = await accountsTable.fetchById(account_id);
    if (!accountToUpdate) {
      return NextResponse.json(
        { error: `Account ${account_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, accountToUpdate, Actions.PutAccountFlags)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    const flagsRequest = AccountFlagsSchema.parse(await request.json());
    if (!accountToUpdate) {
      return NextResponse.json(
        { error: `Account ${account_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    accountToUpdate.flags = flagsRequest;
    const updatedAccount = await accountsTable.update(accountToUpdate);
    return NextResponse.json(updatedAccount.flags, { status: StatusCodes.OK });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
