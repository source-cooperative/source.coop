import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { isAuthorized } from "@/lib/api/authz";
import { getApiSession } from "@/lib/api/utils";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { accountParams, errors, json, registry } from "@/lib/api/openapi";
import { accountsTable } from "@/lib/clients/database";
import { accountExists, getAccount } from "@/lib/operations/accounts";
import { AccountSchema, Actions } from "@/types";

type Params = { account_id: string };

const params = accountParams;

registry.registerPath({
  method: "get",
  path: "/accounts/{account_id}",
  tags: ["Accounts"],
  summary: "Get an account",
  description:
    "The whole account record, emails and flags included. A person may read their own; an organization's owners and maintainers may read it; an admin may read any. Everyone else reads the public profile instead.",
  request: { params },
  responses: {
    200: json("The account.", AccountSchema),
    ...errors(401, 403, 404),
  },
});

export const GET = withApiSession<Params>(async ({ session, params }) =>
  toResponse(await getAccount(session, params.account_id))
);

registry.registerPath({
  method: "head",
  path: "/accounts/{account_id}",
  tags: ["Accounts"],
  summary: "Check that an account exists",
  description:
    "Answers 200 if an account, of any kind and in any state, holds this ID, and 404 if none does. Needs no credentials. A free ID is not necessarily one you may take.",
  request: { params },
  responses: {
    200: { description: "An account holds this ID." },
    404: { description: "No account holds this ID." },
  },
});

export async function HEAD(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { account_id } = await params;
  return new NextResponse(null, {
    status: (await accountExists(account_id))
      ? StatusCodes.OK
      : StatusCodes.NOT_FOUND,
  });
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
  { params }: { params: Promise<{ account_id: string }> }
) {
  try {
    const { account_id } = await params;
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
    const account = await accountsTable.update(disableAccount);
    return NextResponse.json(account, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
