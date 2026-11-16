import { z } from "zod";
import { StatusCodes } from "http-status-codes";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, registry } from "@/lib/api/openapi";
import {
  CreatedServiceAccountSchema,
  createServiceAccount,
  CreateServiceAccountSchema,
  listServiceAccounts,
  ServiceAccountPageSchema,
} from "@/lib/operations/service-accounts";

type Params = { account_id: string };

const params = z.object({
  account_id: z.string().openapi({ description: "The owner's ID." }),
});

registry.registerPath({
  method: "get",
  path: "/accounts/{account_id}/service-accounts",
  tags: ["Service accounts"],
  summary: "List an account's service accounts",
  description:
    "The service accounts an account owns. Open to whoever manages the account, once an admin has let it own service accounts.",
  security: bearer,
  request: { params },
  responses: {
    200: json("The service accounts.", ServiceAccountPageSchema),
    ...errors(401, 403, 404),
  },
});

export const GET = withApiSession<Params>(async ({ session, params }) =>
  toResponse(await listServiceAccounts(session, params.account_id))
);

registry.registerPath({
  method: "post",
  path: "/accounts/{account_id}/service-accounts",
  tags: ["Service accounts"],
  summary: "Create a service account",
  description:
    "Creates a service account owned by this account, with the id `{account_id}--{local_id}`. It can be granted read or write access to its owner's products, here or later as a member of the product, and trusted by GitHub Actions workflows, here or later through its trusts. A service account can't own another.\n\nIf you send `key`, the response also holds an API key for the account. Nothing shows that key again.",
  security: bearer,
  request: {
    params,
    body: { content: { "application/json": { schema: CreateServiceAccountSchema } } },
  },
  responses: {
    201: json("The service account, with its API key if you asked for one.", CreatedServiceAccountSchema),
    ...errors(400, 401, 403, 404, 409),
  },
});

export const POST = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(
    await createServiceAccount(session, params.account_id, body),
    StatusCodes.CREATED
  )
);
