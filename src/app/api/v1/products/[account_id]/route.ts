import { z } from "zod";
import { StatusCodes } from "http-status-codes";
import { ProductSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, registry } from "@/lib/api/openapi";
import {
  CreateProductSchema,
  createProduct,
  listProducts,
  PageQuerySchema,
  ProductPageSchema,
} from "@/lib/operations/products";

type Params = { account_id: string };

const params = z.object({
  account_id: z.string().openapi({ description: "The account's ID." }),
});

registry.registerPath({
  method: "get",
  path: "/products/{account_id}",
  tags: ["Products"],
  summary: "List an account's products",
  description:
    "The account's products that the caller may see, one page at a time. Anyone sees the public ones; unlisted and restricted ones need a member's credentials.",
  request: { params, query: PageQuerySchema },
  responses: {
    200: json("A page of products.", ProductPageSchema),
    ...errors(400, 404),
  },
});

export const GET = withApiSession<Params>(async ({ request, session, params }) =>
  toResponse(
    await listProducts(
      session,
      Object.fromEntries(request.nextUrl.searchParams),
      params.account_id
    )
  )
);

registry.registerPath({
  method: "post",
  path: "/products/{account_id}",
  tags: ["Products"],
  summary: "Create a product",
  description:
    "Creates a product owned by the account, stored on one of the data connections the caller may use for it. The connection must allow the product's visibility.",
  security: bearer,
  request: {
    params,
    body: {
      content: {
        "application/json": { schema: CreateProductSchema.omit({ account_id: true }) },
      },
    },
  },
  responses: {
    201: json("The new product.", ProductSchema),
    ...errors(400, 401, 403, 404, 409),
  },
});

export const POST = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(
    await createProduct(session, { ...(body as object), account_id: params.account_id }),
    StatusCodes.CREATED
  )
);
