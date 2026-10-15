import { RepositoryPermissionsResponseSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import {
  errors,
  forDataProxy,
  json,
  optionalBearer,
  productParams,
  registry,
} from "@/lib/api/openapi";
import { getProductPermissions } from "@/lib/operations/products";

type Params = { account_id: string; product_id: string };

registry.registerPath({
  method: "get",
  path: "/products/{account_id}/{product_id}/permissions",
  tags: ["Products"],
  summary: "What you may do with a product's data",
  ...forDataProxy(
    "`read`, `write`, both or neither, for whoever the credentials belong to, or for anyone when there are none. Never refused: a caller with no access gets an empty list."
  ),
  security: optionalBearer,
  request: { params: productParams },
  responses: {
    200: json("The permissions.", RepositoryPermissionsResponseSchema),
    ...errors(404),
  },
});

export const GET = withApiSession<Params>(async ({ session, params }) =>
  toResponse(
    await getProductPermissions(session, params.account_id, params.product_id)
  )
);
