import { StatusCodes } from "http-status-codes";
import { NextRequest, NextResponse } from "next/server";
import { AccountCreationRequestSchema, Actions, AccountFlags } from "@/types";
import { AccountType } from "@/types/account";
import { Account } from "@/types/account";
import { isAuthorized } from "@/lib/api/authz";
import { getApiSession } from "@/lib/api/utils";
import { accountsTable } from "@/lib/clients/database";

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
export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    const body = await request.json();
    const accountRequest = AccountCreationRequestSchema.parse(body);
    const flags: AccountFlags[] = isProd
      ? [AccountFlags.CREATE_ORGANIZATIONS]
      : [
          AccountFlags.CREATE_ORGANIZATIONS,
          AccountFlags.CREATE_REPOSITORIES,
          AccountFlags.ADMIN,
        ];
    const newAccount: Account = {
      ...accountRequest,
      disabled: false,
      flags,
      metadata_private:
        accountRequest.type === AccountType.INDIVIDUAL
          ? {
              identity_id: session?.identity_id ?? "",
            }
          : undefined,
    };
    if (!isAuthorized(session, newAccount, Actions.CreateAccount)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    try {
      const account = await accountsTable.create(newAccount);
      return NextResponse.json(account, { status: StatusCodes.OK });
    } catch (e) {
      console.error(`Error creating account: ${e}`);
      return NextResponse.json(
        { error: `Account with ID ${newAccount.account_id} already exists` },
        { status: StatusCodes.BAD_REQUEST }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
