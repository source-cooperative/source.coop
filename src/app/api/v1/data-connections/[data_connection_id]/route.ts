import { z } from "zod";
import { DataConnectionObjectSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, registry } from "@/lib/api/openapi";
import {
  deleteDataConnection,
  getDataConnection,
  updateDataConnection,
  UpdateDataConnectionSchema,
} from "@/lib/operations/data-connections";

type Params = { data_connection_id: string };

const params = z.object({
  data_connection_id: z
    .string()
    .openapi({ description: "The data connection's ID." }),
});

registry.registerPath({
  method: "get",
  path: "/data-connections/{data_connection_id}",
  tags: ["Data Connections"],
  summary: "Get a data connection",
  description:
    "Static keys and SAS tokens are never returned; federated settings such as a role ARN are.",
  request: { params },
  responses: {
    200: json("The connection.", DataConnectionObjectSchema),
    ...errors(403, 404),
  },
});

export const GET = withApiSession<Params>(async ({ session, params }) =>
  toResponse(await getDataConnection(session, params.data_connection_id))
);

registry.registerPath({
  method: "patch",
  path: "/data-connections/{data_connection_id}",
  tags: ["Data Connections"],
  summary: "Update a data connection",
  description:
    "Each field given replaces the stored one; `details` and `authentication` are replaced whole. Since secrets are never returned, a secret left blank or out under the same `authentication.type` keeps the stored one. A connection's ID and owner never change.",
  security: bearer,
  request: {
    params,
    body: {
      content: { "application/json": { schema: UpdateDataConnectionSchema } },
    },
  },
  responses: {
    200: json("The connection, as it now stands.", DataConnectionObjectSchema),
    ...errors(400, 401, 403, 404),
  },
});

export const PATCH = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(
    await updateDataConnection(session, params.data_connection_id, body)
  )
);

registry.registerPath({
  method: "delete",
  path: "/data-connections/{data_connection_id}",
  tags: ["Data Connections"],
  summary: "Delete a data connection",
  description:
    "Refused while any product still keeps its data on the connection.",
  security: bearer,
  request: { params },
  responses: {
    200: json("The connection that was deleted.", DataConnectionObjectSchema),
    ...errors(401, 403, 404, 409),
  },
});

export const DELETE = withApiSession<Params>(async ({ session, params }) =>
  toResponse(await deleteDataConnection(session, params.data_connection_id))
);
