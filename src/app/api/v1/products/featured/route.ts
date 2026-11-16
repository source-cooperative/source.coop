import { ProductResponseSchema } from "@/types";
import { z } from "zod";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { errors, json, optionalBearer, registry } from "@/lib/api/openapi";
import { listProducts } from "@/lib/operations/products";
import { ok } from "@/lib/operations/result";

registry.registerPath({
  method: "get",
  path: "/products/featured",
  tags: ["Products"],
  summary: "List featured products",
  description:
    "Up to ten featured products, as `{ \"products\": [...] }`. Kept for the clients that already call it; use `GET /products?featured=true`, which pages.",
  deprecated: true,
  security: optionalBearer,
  responses: {
    200: json("The featured products.", z.object({ products: z.array(ProductResponseSchema) })),
    ...errors(400),
  },
});

export const GET = withApiSession(async ({ session }) => {
  const result = await listProducts(session, { featured: "true", limit: "10" });
  return toResponse(result.ok ? ok({ products: result.value.items }) : result);
});
