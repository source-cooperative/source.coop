import { StatusCodes } from "http-status-codes";
import { DataConnectionObjectSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, registry } from "@/lib/api/openapi";
import {
  createDataConnection,
  CreateDataConnectionSchema,
  listDataConnections,
  ListDataConnectionsQuerySchema,
} from "@/lib/operations/data-connections";
import { pageSchema } from "@/lib/operations/result";

registry.registerPath({
  method: "get",
  path: "/data-connections",
  tags: ["Data Connections"],
  summary: "List data connections",
  description:
    "The storage locations products can keep their data in: the platform's own, and the account-owned ones the caller manages. Static keys and SAS tokens are never returned; federated settings such as a role ARN are. `?usable_for=` answers which connections a new product under that account may use; `?owner=` lists the connections an account manages.",
  request: { query: ListDataConnectionsQuerySchema },
  responses: {
    200: json(
      "The connections.",
      pageSchema("DataConnectionPage", DataConnectionObjectSchema)
    ),
    ...errors(400, 401, 403, 404),
  },
});

export const GET = withApiSession(async ({ session, request }) =>
  toResponse(
    await listDataConnections(
      session,
      Object.fromEntries(request.nextUrl.searchParams)
    ),
    StatusCodes.OK,
    "query"
  )
);

registry.registerPath({
  method: "post",
  path: "/data-connections",
  tags: ["Data Connections"],
  summary: "Create a data connection",
  description:
    "Its ID is made from `name`, and from `owner` when an account owns it (`owner--name`). An account's owners and maintainers may create its connections once the platform has given it the `create_data_connections` flag; only platform admins create connections without an owner. An owned connection never carries a `required_flag`.",
  security: bearer,
  request: {
    body: {
      content: { "application/json": { schema: CreateDataConnectionSchema } },
    },
  },
  responses: {
    201: json("The connection, without its secrets.", DataConnectionObjectSchema),
    ...errors(400, 401, 403, 409),
  },
});

export const POST = withApiSession(async ({ session, body }) =>
  toResponse(await createDataConnection(session, body), StatusCodes.CREATED)
);
