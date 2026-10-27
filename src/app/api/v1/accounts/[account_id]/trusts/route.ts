import { z } from "zod";
import { StatusCodes } from "http-status-codes";
import { AccountTrustSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, registry } from "@/lib/api/openapi";
import {
  AccountTrustPageSchema,
  addGithubTrust,
  AddGithubTrustSchema,
  listTrusts,
  removeTrust,
  RemoveTrustQuerySchema,
} from "@/lib/operations/service-accounts";

type Params = { account_id: string };

const params = z.object({
  account_id: z.string().openapi({ description: "The service account's ID." }),
});

registry.registerPath({
  method: "get",
  path: "/accounts/{account_id}/trusts",
  tags: ["Service accounts"],
  summary: "List a service account's trusts",
  description:
    "The workload identities that may act as the service account by exchanging their own tokens. Open to whoever manages it.",
  security: bearer,
  request: { params },
  responses: {
    200: json("The trusts.", AccountTrustPageSchema),
    ...errors(401, 404),
  },
});

export const GET = withApiSession<Params>(async ({ session, params }) =>
  toResponse(await listTrusts(session, params.account_id))
);

registry.registerPath({
  method: "post",
  path: "/accounts/{account_id}/trusts",
  tags: ["Service accounts"],
  summary: "Trust a GitHub Actions workflow",
  description:
    "Lets a GitHub Actions workflow act as the service account. A disabled service account takes no new trusts.",
  security: bearer,
  request: {
    params,
    body: { content: { "application/json": { schema: AddGithubTrustSchema } } },
  },
  responses: {
    201: json("The trust.", AccountTrustSchema),
    ...errors(400, 401, 404, 409),
  },
});

export const POST = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(
    await addGithubTrust(session, params.account_id, body),
    StatusCodes.CREATED
  )
);

registry.registerPath({
  method: "delete",
  path: "/accounts/{account_id}/trusts",
  tags: ["Service accounts"],
  summary: "Remove a trust",
  description:
    "Stops the identity that `issuer` and `subject` name from acting as the service account.",
  security: bearer,
  request: { params, query: RemoveTrustQuerySchema },
  responses: {
    200: json("The trust as it was.", AccountTrustSchema),
    ...errors(400, 401, 404),
  },
});

export const DELETE = withApiSession<Params>(async ({ request, session, params }) =>
  toResponse(
    await removeTrust(
      session,
      params.account_id,
      Object.fromEntries(request.nextUrl.searchParams)
    ),
    StatusCodes.OK,
    "query"
  )
);
