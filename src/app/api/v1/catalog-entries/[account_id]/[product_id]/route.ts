import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, productParams, registry } from "@/lib/api/openapi";
import {
  CatalogEntryEditSchema,
  updateCatalogEntry,
  UpdateCatalogEntrySchema,
} from "@/lib/operations/catalog";

type Params = { account_id: string; product_id: string };

registry.registerPath({
  method: "patch",
  path: "/catalog-entries/{account_id}/{product_id}",
  tags: ["Products"],
  summary: "Edit a product's metadata-catalog entry",
  description:
    "Changes the fields given in the product's record in the metadata catalog, and leaves the rest. You may edit the entry if you may edit the product. Each edit is a commit to the catalog's repository, and the entry is marked as edited by you. Returns 404 if the catalog has no entry for the product yet. Returns 409 if the entry changed while you edited it; try again. The daily catalog file shows the edit after its next build.",
  security: bearer,
  request: {
    params: productParams,
    body: { content: { "application/json": { schema: UpdateCatalogEntrySchema } } },
  },
  responses: {
    200: json("The entry's editable fields, as edited.", CatalogEntryEditSchema),
    ...errors(400, 401, 403, 404, 409),
  },
});

export const PATCH = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(await updateCatalogEntry(session, params.account_id, params.product_id, body))
);
