import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { getEmail, getProfileImage } from "@/lib/api/utils";
import { accountsTable, isIndividualAccount } from "@/lib/clients/database";
import { isAuthorized } from "@/lib/api/authz";
import { getApiSession } from "@/lib/api/utils";
import { AccountProfileResponse, AccountProfileSchema, Actions } from "@/types";

/**
 * @openapi
 * /accounts/{account_id}/profile:
 *   get:
 *     tags: [Accounts]
 *     summary: Get account profile
 *     description: Retrieves the profile of a specific account. Any user, authenticated or not, can retrieve the profile of any account.
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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string }> }
) {
  try {
    const { account_id } = await params;
    const session = await getApiSession(request);
    const account = await accountsTable.fetchById(account_id);
    if (!account) {
      return NextResponse.json(
        { error: `Account ${account_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (
      account.disabled ||
      !isIndividualAccount(account) ||
      !isAuthorized(session, account, Actions.GetAccountProfile)
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    const email = await getEmail(account.identity_id);
    const profile: AccountProfileResponse = {
      ...account.metadata_public,
      profile_image: email ? getProfileImage(email) : undefined,
      type: account.type,
    };
    return NextResponse.json(profile, { status: StatusCodes.OK });
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
 * /accounts/{account_id}/profile:
 *   put:
 *     tags: [Accounts]
 *     summary: Update account profile
 *     description: Updates the profile of a specific account.
 *       For a User account, you must be authenticated as the user you are updating the profile for.
 *       For an Organization account, you must be authenticated as an `owners` member of the organization you are updating the profile for.
 *      Users with the `admin` flag may update the profile for any account.
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
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string }> }
) {
  try {
    const { account_id } = await params;
    const session = await getApiSession(request);
    const profileRequest = AccountProfileSchema.parse(await request.json());
    const updateProfileAccount = await accountsTable.fetchById(account_id);
    if (!updateProfileAccount) {
      return NextResponse.json(
        { error: `Account ${account_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (
      !isAuthorized(session, updateProfileAccount, Actions.PutAccountProfile)
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    updateProfileAccount.metadata_public = profileRequest;
    const updatedAccount = await accountsTable.update(updateProfileAccount);
    return NextResponse.json(updatedAccount.metadata_public, {
      status: StatusCodes.OK,
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
