import { z } from "zod";
import { StatusCodes } from "http-status-codes";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, productParams, registry } from "@/lib/api/openapi";
import {
  addMirror,
  AddMirrorSchema,
  listMirrors,
  MirrorSchema,
} from "@/lib/operations/mirrors";

type Params = { account_id: string; product_id: string };

const params = productParams;

registry.registerPath({
  method: "get",
  path: "/products/{account_id}/{product_id}/mirrors",
  tags: ["Mirrors"],
  summary: "List a product's mirrors",
  description:
    "The data connections a product's objects are stored on, and where in each. Anyone who may read the product may read its mirrors.",
  request: { params },
  responses: {
    200: json("The mirrors.", z.array(MirrorSchema)),
    ...errors(401, 403, 404),
  },
});

export const GET = withApiSession<Params>(async ({ session, params }) =>
  toResponse(await listMirrors(session, params.account_id, params.product_id))
);

registry.registerPath({
  method: "post",
  path: "/products/{account_id}/{product_id}/mirrors",
  tags: ["Mirrors"],
  summary: "Add a mirror",
  description:
    "Mirrors a product to another data connection, at the prefix the connection's template gives it. A product's first mirror becomes its primary. Only owners and maintainers of the owning account may manage its mirrors.",
  security: bearer,
  request: {
    params,
    body: { content: { "application/json": { schema: AddMirrorSchema } } },
  },
  responses: {
    201: json("The new mirror.", MirrorSchema),
    ...errors(400, 401, 403, 404, 409),
  },
});

export const POST = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(
    await addMirror(session, params.account_id, params.product_id, body),
    StatusCodes.CREATED
  )
);
