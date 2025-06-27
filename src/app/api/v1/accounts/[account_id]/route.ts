import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { isAuthorized } from "@/lib/api/authz";
import { getApiSession } from "@/lib/api/utils";
import { accountsTable } from "@/lib/clients/database";
import { Actions } from "@/types";

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

export async function GET(
  request: NextRequest,
  { params }: { params: { account_id: string } }
) {
  try {
    const { account_id } = params;
    const session = await getApiSession(request);
    const account = await accountsTable.fetchById(account_id);
    if (!account) {
      return NextResponse.json(
        { error: `Account ${account_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, account, Actions.GetAccount)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    return NextResponse.json(account, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
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
export async function DELETE(
  request: NextRequest,
  { params }: { params: { account_id: string } }
) {
  try {
    const { account_id } = params;
    const session = await getApiSession(request);
    const disableAccount = await accountsTable.fetchById(account_id);
    if (!disableAccount) {
      return NextResponse.json(
        { error: `Account ${account_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, disableAccount, Actions.DisableAccount)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    disableAccount.disabled = true;
    const [account, _success] = await accountsTable.update(disableAccount);
    return NextResponse.json(account, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
