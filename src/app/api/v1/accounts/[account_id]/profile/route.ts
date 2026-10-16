import { AccountProfileResponseSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { accountParams, errors, json, registry } from "@/lib/api/openapi";
import { getAccountProfile } from "@/lib/operations/accounts";

type Params = { account_id: string };

registry.registerPath({
  method: "get",
  path: "/accounts/{account_id}/profile",
  tags: ["Accounts"],
  summary: "Get an account's profile",
  description:
    "The public face of a person or organization, which anyone may read. A disabled account's profile is not found, except by an admin; a service account has none. Edit it with `PATCH /accounts/{account_id}`.",
  request: { params: accountParams },
  responses: {
    200: json("The profile.", AccountProfileResponseSchema),
    ...errors(403, 404),
  },
});

export const GET = withApiSession<Params>(async ({ session, params }) =>
  toResponse(await getAccountProfile(session, params.account_id))
);
