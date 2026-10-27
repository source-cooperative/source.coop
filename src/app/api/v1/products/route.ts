import { StatusCodes } from "http-status-codes";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { errors, json, optionalBearer, registry } from "@/lib/api/openapi";
import {
  ListProductsQuerySchema,
  listProducts,
  ProductPageSchema,
} from "@/lib/operations/products";

registry.registerPath({
  method: "get",
  path: "/products",
  tags: ["Products"],
  summary: "List public products",
  description:
    "Public products, most featured first, one page at a time. Credentials are optional; a token returns the full embedded account.",
  security: optionalBearer,
  request: { query: ListProductsQuerySchema },
  responses: {
    200: json("A page of products.", ProductPageSchema),
    ...errors(400),
  },
});

export const GET = withApiSession(async ({ request, session }) =>
  toResponse(
    await listProducts(session, Object.fromEntries(request.nextUrl.searchParams)),
    StatusCodes.OK,
    "query"
  )
);
