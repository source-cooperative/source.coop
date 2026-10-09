import { z } from "zod";
import { ProductSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, registry } from "@/lib/api/openapi";
import {
  deleteProduct,
  DeleteProductQuerySchema,
  getProduct,
  updateProduct,
  UpdateProductSchema,
} from "@/lib/operations/products";

type Params = { account_id: string; product_id: string };

const params = z.object({
  account_id: z.string().openapi({ description: "The product owner's ID." }),
  product_id: z.string().openapi({ description: "The product's ID." }),
});

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
    "Deletes the product, its memberships and, unless `preserve_data` is set, its objects. Objects on a read-only data connection are never deleted. Only the owning account or an owner of the product may delete it.",
  security: bearer,
  request: { params, query: DeleteProductQuerySchema },
  responses: {
    200: json("The product as it was.", ProductSchema),
    ...errors(400, 401, 403, 404),
  },
});

export const DELETE = withApiSession<Params>(async ({ request, session, params }) =>
  toResponse(
    await deleteProduct(
      session,
      params.account_id,
      params.product_id,
      Object.fromEntries(request.nextUrl.searchParams)
    )
  )
);
