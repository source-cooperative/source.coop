import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { Actions, UserSession } from "@/types";
import { isAuthorized } from "@/lib/api/authz";
import { productsTable } from "@/lib/clients/database";
import { readEntry, writeEntry } from "@/lib/clients/catalog-repo";
import { setTopLevel } from "@/lib/catalog-json";
import { canonTag, TAG_PATTERN } from "@/lib/tags/canon";
import { LOGGER } from "@/lib/logging";
import { refuse } from "./products";
import {
  conflict,
  fromZodError,
  invalid,
  notFound,
  ok,
  OperationResult,
  unauthenticated,
} from "./result";

const MAX_KEYWORDS = 30;

export const UpdateCatalogEntrySchema = z
  .object({
    keywords: z
      .array(z.string())
      .max(MAX_KEYWORDS)
      .optional()
      .openapi({
        description: `The product's keywords, replacing the current list. Each is spelled as a tag is: lowercase, with hyphens between words. At most ${MAX_KEYWORDS}.`,
        example: ["building-footprints", "geoparquet"],
      }),
  })
  .refine((fields) => Object.values(fields).some((v) => v !== undefined), {
    message: "Give at least one field to change",
  })
  .openapi("UpdateCatalogEntry");

export const CatalogEntryEditSchema = z
  .object({
    account_id: z.string(),
    product_id: z.string(),
    keywords: z.array(z.string()),
  })
  .openapi("CatalogEntryEdit");

type CatalogEntryEdit = z.infer<typeof CatalogEntryEditSchema>;

/**
 * Edits the fields of a product's record in the metadata catalog, as a commit
 * to the catalog's repo. Who may is who may edit the product.
 */
export async function updateCatalogEntry(
  session: UserSession | null,
  account_id: string,
  product_id: string,
  input: unknown
): Promise<OperationResult<CatalogEntryEdit>> {
  if (!session) return unauthenticated();
  // The product's own record is what makes the id safe to use as a path.
  const product =
    account_id && product_id && (await productsTable.fetchById(account_id, product_id));
  if (!product) return notFound(`Product ${account_id}/${product_id} not found`);
  if (!isAuthorized(session, product, Actions.PutRepository)) {
    return refuse(session, product, "You may not edit this product");
  }
  const parsed = UpdateCatalogEntrySchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const keywords = [...new Set((parsed.data.keywords ?? []).map(canonTag))];
  const bad = keywords.find((k) => !TAG_PATTERN.test(k));
  if (bad !== undefined) {
    return invalid(
      `"${bad}" is not a keyword: use up to 40 lowercase letters, digits or hyphens`,
      "keywords"
    );
  }

  const path = `${account_id}/${product_id}.json`;
  const file = await readEntry(path);
  if (!file) {
    return notFound(`The catalog has no entry for ${account_id}/${product_id} yet`);
  }
  const entry = JSON.parse(file.text);
  const result = { account_id, product_id, keywords };
  if (isDeepStrictEqual(entry.keywords ?? [], keywords)) return ok(result);

  const by = session.account?.account_id;
  // ponytail: `fields` only ever names `keywords` until another field is editable.
  const edited = { ts: new Date().toISOString(), by, fields: ["keywords"] };
  const text = setTopLevel(setTopLevel(file.text, "keywords", keywords), "_edited", edited);
  // The splice must change nothing but what was asked for.
  const check = JSON.parse(text);
  if (!isDeepStrictEqual(check.keywords, keywords) || !isDeepStrictEqual(check._edited, edited)) {
    throw new Error(`Catalog entry ${path} did not survive the edit`);
  }

  const written = await writeEntry(
    path,
    text,
    file.sha,
    `catalog: edit keywords of ${account_id}/${product_id}\n\nEdited by ${by} on source.coop.`
  );
  if (!written) {
    return conflict("The catalog entry changed while you were editing it. Try again.");
  }
  LOGGER.info("Catalog entry edited", {
    operation: "updateCatalogEntry",
    metadata: { account_id, product_id, by, keywords },
  });
  return ok(result);
}
