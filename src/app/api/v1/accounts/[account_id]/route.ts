import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { accountParams, bearer, errors, json, registry } from "@/lib/api/openapi";
import {
  accountExists,
  deleteAccount,
  getAccount,
  updateAccount,
  UpdateAccountSchema,
} from "@/lib/operations/accounts";
import { AccountSchema } from "@/types";

type Params = { account_id: string };

const params = accountParams;

registry.registerPath({
  method: "get",
  path: "/accounts/{account_id}",
  tags: ["Accounts"],
  summary: "Get an account",
  description:
    "The whole account record, emails and flags included. A person may read their own; an organization's owners and maintainers may read it; an admin may read any. Everyone else reads the public profile instead.",
  security: bearer,
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

registry.registerPath({
  method: "patch",
  path: "/accounts/{account_id}",
  tags: ["Accounts"],
  summary: "Edit an account",
  description:
    "Changes the fields given and leaves the rest; an empty string clears a profile field. A person may edit their own account, an organization's owners and maintainers theirs, and whoever manages a service account's owner may rename it; an admin may edit any. `disabled` takes more: an organization's owners, a service account's managers, or an admin. A service account has only a `name`. A disabled account can be re-enabled, but not otherwise edited until it is, except by an admin.",
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
    "Deletes a service account, with every grant it held, its trusts, and every API key it had, which is revoked. Open to whoever manages its owner. A person's or organization's account is never deleted: this answers 409, and `PATCH /accounts/{account_id}` with `{ \"disabled\": true }` disables it.",
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
