import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { isAuthorized } from "@/lib/api/authz";
import { getApiSession } from "@/lib/api/utils";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, registry } from "@/lib/api/openapi";
import { accountsTable } from "@/lib/clients/database";
import { deny, notFound, ok } from "@/lib/operations/result";
import {
  deleteServiceAccount,
  updateServiceAccount,
  UpdateServiceAccountSchema,
} from "@/lib/operations/service-accounts";
import { AccountSchema, Actions, isServiceAccount, ServiceAccountSchema } from "@/types";

type Params = { account_id: string };

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
 *   head:
 *     tags: [Accounts]
 *     summary: Check if an account exists
 *     description: Checks if an account exists.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account to retrieve
 *     responses:
 *       200:
 *         description: Account exists
 *       404:
 *         description: Account does not exist
 *       500:
 *         description: Internal server error
 */

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string }> }
) {
  try {
    const { account_id } = await params;
    const account = await accountsTable.fetchById(account_id);
    if (!account) {
      return new NextResponse(null, { status: StatusCodes.NOT_FOUND });
    }
    return new NextResponse(null, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}


const params = z.object({
  account_id: z.string().openapi({ description: "The account's ID." }),
});

registry.registerPath({
  method: "patch",
  path: "/accounts/{account_id}",
  tags: ["Service accounts"],
  summary: "Edit a service account",
  description:
    "Renames, disables or enables a service account. Its id, which software signs in as, stays. Open to whoever manages it.",
  security: bearer,
  request: {
    params,
    body: { content: { "application/json": { schema: UpdateServiceAccountSchema } } },
  },
  responses: {
    200: json("The service account as edited.", ServiceAccountSchema),
    ...errors(400, 401, 404),
  },
});

export const PATCH = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(await updateServiceAccount(session, params.account_id, body))
);

registry.registerPath({
  method: "delete",
  path: "/accounts/{account_id}",
  tags: ["Accounts", "Service accounts"],
  summary: "Delete a service account, or disable any other account",
  description:
    "A service account is deleted, with every grant it held and every way it could sign in, by whoever manages it. Any other account is disabled instead: an organization by its owners and maintainers, a person only by an admin.",
  security: bearer,
  request: { params },
  responses: {
    200: json("The service account as it was, or the account as disabled.", AccountSchema),
    ...errors(401, 403, 404),
  },
});

export const DELETE = withApiSession<Params>(async ({ session, params }) => {
  const account = params.account_id && (await accountsTable.fetchById(params.account_id));
  if (!account) return toResponse(notFound(`Account ${params.account_id} not found`));
  if (isServiceAccount(account)) {
    return toResponse(await deleteServiceAccount(session, account.account_id));
  }
  if (!isAuthorized(session, account, Actions.DisableAccount)) {
    return toResponse(deny(session, "You may not disable this account"));
  }
  return toResponse(ok(await accountsTable.update({ ...account, disabled: true })));
});
