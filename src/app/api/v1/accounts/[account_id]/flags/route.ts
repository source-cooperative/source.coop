import { AccountFlagsSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { accountParams, bearer, errors, json, registry } from "@/lib/api/openapi";
import { getAccountFlags, updateAccountFlags } from "@/lib/operations/accounts";

type Params = { account_id: string };

const params = accountParams;

registry.registerPath({
  method: "get",
  path: "/accounts/{account_id}/flags",
  tags: ["Accounts"],
  summary: "Get an account's flags",
  description:
    "What the account may do beyond the basics, such as create products or administer the platform. A person may read their own, an organization's owners and maintainers theirs, and an admin anyone's.",
  security: bearer,
  request: { params },
  responses: {
    200: json("The flags.", AccountFlagsSchema),
    ...errors(401, 403, 404),
  },
});

export const GET = withApiSession<Params>(async ({ session, params }) =>
  toResponse(await getAccountFlags(session, params.account_id))
);

registry.registerPath({
  method: "put",
  path: "/accounts/{account_id}/flags",
  tags: ["Accounts"],
  summary: "Set an account's flags",
  description:
    "Replaces the account's flags with the ones given. Only an admin may, and a service account may never hold `admin`.",
  security: bearer,
  request: {
    params,
    body: { content: { "application/json": { schema: AccountFlagsSchema } } },
  },
  responses: {
    200: json("The flags as set.", AccountFlagsSchema),
    ...errors(400, 401, 403, 404),
  },
});

export const PUT = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(await updateAccountFlags(session, params.account_id, body))
);
