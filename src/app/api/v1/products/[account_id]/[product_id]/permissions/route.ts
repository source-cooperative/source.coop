import { RepositoryPermissionsResponseSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import {
  errors,
  internal,
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
  ...internal,
  summary: "What a caller may do with a product's data",
  description:
    "Called by the data proxy before a write, on behalf of the person or service account behind the request. Returns `read`, or `read` and `write`, from the caller's role on the product. It does not include the data connection's `read_only` mode; the proxy checks that separately. A caller who may not read the product is refused, as when they view it.",
  security: optionalBearer,
  request: { params: productParams },
  responses: {
    200: json("The permissions.", RepositoryPermissionsResponseSchema),
    ...errors(401, 403, 404),
  },
});

export const GET = withApiSession<Params>(async ({ session, params }) =>
  toResponse(
    await getProductPermissions(session, params.account_id, params.product_id)
  )
);
