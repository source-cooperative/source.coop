import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, productParams, registry } from "@/lib/api/openapi";
import {
  MirrorSchema,
  removeMirror,
  updateMirror,
  UpdateMirrorSchema,
} from "@/lib/operations/mirrors";

type Params = { account_id: string; product_id: string; connection_id: string };

const params = productParams.extend({
  connection_id: MirrorSchema.shape.connection_id,
});

registry.registerPath({
  method: "patch",
  path: "/products/{account_id}/{product_id}/mirrors/{connection_id}",
  tags: ["Mirrors"],
  summary: "Edit a mirror",
  description:
    "Changes a mirror's prefix, makes it the primary, or both. Only owners and maintainers of the owning account may manage its mirrors. A 409 means the product changed since it was read; read it again and retry.",
  security: bearer,
  request: {
    params,
    body: { content: { "application/json": { schema: UpdateMirrorSchema } } },
  },
  responses: {
    200: json("The mirror as edited.", MirrorSchema),
    ...errors(400, 401, 403, 404, 409),
  },
});

export const PATCH = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(
    await updateMirror(
      session,
      params.account_id,
      params.product_id,
      params.connection_id,
      body
    )
  )
);

registry.registerPath({
  method: "delete",
  path: "/products/{account_id}/{product_id}/mirrors/{connection_id}",
  tags: ["Mirrors"],
  summary: "Remove a mirror",
  description:
    "Stops serving the product from this data connection; its objects there are not deleted. Removing the primary promotes another mirror, if there is one. Only owners and maintainers of the owning account may manage its mirrors.",
  security: bearer,
  request: { params },
  responses: {
    200: json("The mirror as it was.", MirrorSchema),
    ...errors(401, 403, 404, 409),
  },
});

export const DELETE = withApiSession<Params>(async ({ session, params }) =>
  toResponse(
    await removeMirror(session, params.account_id, params.product_id, params.connection_id)
  )
);
