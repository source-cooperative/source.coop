import { z } from "zod";
import { StatusCodes } from "http-status-codes";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, registry } from "@/lib/api/openapi";
import {
  issueKey,
  IssuedKeySchema,
  IssueKeySchema,
  listKeys,
  ServiceAccountKeyPageSchema,
} from "@/lib/operations/service-accounts";

type Params = { account_id: string };

const params = z.object({
  account_id: z.string().openapi({ description: "The service account's ID." }),
});

registry.registerPath({
  method: "get",
  path: "/accounts/{account_id}/keys",
  tags: ["Service accounts"],
  summary: "List a service account's API keys",
  description:
    "Returns every API key issued to the service account, including revoked and expired keys. Each key shows its last six characters, never the key itself.\n\nYou may list the keys if you manage the service account. Otherwise this returns 404.",
  security: bearer,
  request: { params },
  responses: {
    200: json("The keys.", ServiceAccountKeyPageSchema),
    ...errors(401, 404),
  },
});

export const GET = withApiSession<Params>(async ({ session, params }) =>
  toResponse(await listKeys(session, params.account_id))
);

registry.registerPath({
  method: "post",
  path: "/accounts/{account_id}/keys",
  tags: ["Service accounts"],
  summary: "Issue an API key",
  description:
    "Issues an API key that signs in as the service account. The response holds the key, and nothing shows it again. Store the key before you discard the response.\n\nYou may issue a key if you manage the service account. Otherwise this returns 404.\n\nA disabled service account gets no new keys, and this returns 409.",
  security: bearer,
  request: {
    params,
    body: { content: { "application/json": { schema: IssueKeySchema } } },
  },
  responses: {
    201: json("The key and its record.", IssuedKeySchema),
    ...errors(400, 401, 404, 409),
  },
});

export const POST = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(await issueKey(session, params.account_id, body), StatusCodes.CREATED)
);
