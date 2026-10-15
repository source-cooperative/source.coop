import { AccountProfileResponseSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { accountParams, bearer, errors, json, registry } from "@/lib/api/openapi";
import {
  getAccountProfile,
  updateAccountProfile,
  UpdateAccountProfileSchema,
} from "@/lib/operations/accounts";

type Params = { account_id: string };

const params = accountParams;

registry.registerPath({
  method: "get",
  path: "/accounts/{account_id}/profile",
  tags: ["Accounts"],
  summary: "Get an account's profile",
  description:
    "The public face of a person or organization, which anyone may read. A disabled account's profile is not found, except by an admin; a service account has none.",
  request: { params },
  responses: {
    200: json("The profile.", AccountProfileResponseSchema),
    ...errors(403, 404),
  },
});

export const GET = withApiSession<Params>(async ({ session, params }) =>
  toResponse(await getAccountProfile(session, params.account_id))
);

registry.registerPath({
  method: "patch",
  path: "/accounts/{account_id}/profile",
  tags: ["Accounts"],
  summary: "Edit an account's profile",
  description:
    "Changes the fields given and leaves the rest; an empty string clears a field. A person may edit their own profile, an organization's owners and maintainers theirs, and an admin anyone's.",
  security: bearer,
  request: {
    params,
    body: { content: { "application/json": { schema: UpdateAccountProfileSchema } } },
  },
  responses: {
    200: json("The profile as edited.", AccountProfileResponseSchema),
    ...errors(400, 401, 403, 404),
  },
});

export const PATCH = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(await updateAccountProfile(session, params.account_id, body))
);
