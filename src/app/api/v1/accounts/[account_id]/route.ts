import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { accountParams, bearer, errors, json, optionalBearer, registry } from "@/lib/api/openapi";
import {
  accountExists,
  deleteAccount,
  getAccount,
  updateAccount,
  UpdateAccountSchema,
} from "@/lib/operations/accounts";
import { z } from "zod";
import { AccountProfileResponseSchema, AccountSchema } from "@/types";

type Params = { account_id: string };

const params = accountParams;

registry.registerPath({
  method: "get",
  path: "/accounts/{account_id}",
  tags: ["Accounts"],
  summary: "Get an account",
  description:
    "Returns the full account record, including emails and flags, if you may read it. People may read their own record, organization owners and maintainers may read their organization's, and admins may read any. Everyone else, including anonymous callers, gets the account's public profile.\n\nReturns 404 for a disabled account unless you may read its full record, and for a service account unless you manage it.",
  security: optionalBearer,
  request: { params },
  responses: {
    200: json(
      "The account record, or its public profile.",
      z.union([AccountSchema, AccountProfileResponseSchema])
    ),
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

registry.registerPath({
  method: "patch",
  path: "/accounts/{account_id}",
  tags: ["Accounts"],
  summary: "Edit an account",
  description:
    "Changes the fields you send and leaves the rest unchanged. An empty string clears a profile field.\n\nPeople may edit their own account, and organization owners and maintainers may edit their organization's. If you manage a service account's owner, you may rename the service account. Admins may edit any account.\n\nSome fields need more. Only organization owners, service-account managers and admins may change `disabled`, and only admins may change `flags`. A service account accepts only `name`, `disabled` and `flags`.\n\nA disabled account can be re-enabled, but only an admin may edit anything else on it until it is.",
  security: bearer,
  request: {
    params,
    body: { content: { "application/json": { schema: UpdateAccountSchema } } },
  },
  responses: {
    200: json("The account as edited.", AccountSchema),
    ...errors(400, 401, 403, 404),
  },
});

export const PATCH = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(await updateAccount(session, params.account_id, body))
);


registry.registerPath({
  method: "delete",
  path: "/accounts/{account_id}",
  tags: ["Accounts"],
  summary: "Delete a service account",
  description:
    "Deletes a service account, along with its product access, its trusts and its API keys. You may delete a service account if you manage its owner; otherwise this returns 404.\n\nPeople and organizations are never deleted. If you may disable the account, this returns 409; disable it instead with `PATCH /accounts/{account_id}` and `{ \"disabled\": true }`. Otherwise it returns 403.",
  security: bearer,
  request: { params },
  responses: {
    200: json("The service account as it was.", AccountSchema),
    ...errors(401, 403, 404, 409),
  },
});

export const DELETE = withApiSession<Params>(async ({ session, params }) =>
  toResponse(await deleteAccount(session, params.account_id))
);
