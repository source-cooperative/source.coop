import { MetadataRoute } from "next";
import { productsTable } from "@/lib/clients/database";
import { isProductDisabled } from "@/lib/api/authz";
import { getBaseUrl } from "@/lib/baseUrl";

// Rendered per request so a product leaves the sitemap as soon as it stops
// being public, and so the build never needs database access.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getBaseUrl();
  const entries: MetadataRoute.Sitemap = [{ url: baseUrl }];

  let lastEvaluatedKey: any = undefined;
  do {
    const { products, lastEvaluatedKey: nextKey } =
      await productsTable.listPublic(1000, lastEvaluatedKey);
    entries.push(
      ...(await productsTable.attachAccounts(products))
        // Disabled products are hidden from anonymous visitors.
        .filter((product) => !isProductDisabled(product))
        .map((product) => ({
          url: `${baseUrl}/${product.account_id}/${product.product_id}`,
          lastModified: product.updated_at,
        }))
    );
    lastEvaluatedKey = nextKey;
  } while (lastEvaluatedKey);

  return entries;
}
