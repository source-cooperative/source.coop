import { ProductSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, productParams, registry } from "@/lib/api/openapi";
import {
  deleteProduct,
  getProduct,
  updateProduct,
  UpdateProductSchema,
} from "@/lib/operations/products";

type Params = { account_id: string; product_id: string };

const params = productParams;

registry.registerPath({
  method: "get",
  path: "/products/{account_id}/{product_id}",
  tags: ["Products"],
  summary: "Get a product",
  description:
    "Anyone may read a public or unlisted product; a restricted one needs a member's credentials. A deactivated product is not found, except by its owners and maintainers.",
  request: { params },
  responses: {
    200: json("The product.", ProductSchema),
    ...errors(401, 403, 404),
  },
});

export const GET = withApiSession<Params>(async ({ session, params }) =>
  toResponse(await getProduct(session, params.account_id, params.product_id))
);

registry.registerPath({
  method: "patch",
  path: "/products/{account_id}/{product_id}",
  tags: ["Products"],
  summary: "Edit a product",
  description:
    "Changes the fields given and leaves the rest. A new visibility must be one the product's data connection allows. Only an admin may edit a deactivated product, which is how one is reactivated.",
  security: bearer,
  request: {
    params,
    body: { content: { "application/json": { schema: UpdateProductSchema } } },
  },
  responses: {
    200: json("The product as edited.", ProductSchema),
    ...errors(400, 401, 403, 404),
  },
});

export const PATCH = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(
    await updateProduct(session, params.account_id, params.product_id, body)
  )
);

registry.registerPath({
  method: "delete",
  path: "/products/{account_id}/{product_id}",
  tags: ["Products"],
  summary: "Delete a product",
  description:
    "Deletes the product and its memberships. A product that still holds objects is refused with a 409: delete its objects first, through the data proxy's S3 API. Objects on a read-only data connection don't count, since Source never deletes them, and neither does storage that can't be reached. Only the owning account or an owner of the product may delete it.",
  security: bearer,
  request: { params },
  responses: {
    200: json("The product as it was.", ProductSchema),
    ...errors(401, 403, 404, 409),
  },
});

export const DELETE = withApiSession<Params>(async ({ session, params }) =>
  toResponse(await deleteProduct(session, params.account_id, params.product_id))
);
