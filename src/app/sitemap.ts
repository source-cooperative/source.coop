import { MetadataRoute } from "next";
import { productsTable } from "@/lib/clients/database";

const BASE_URL = "https://source.coop";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [{ url: BASE_URL }];

  let lastEvaluatedKey: any = undefined;
  do {
    const { products, lastEvaluatedKey: nextKey } =
      await productsTable.listPublic(1000, lastEvaluatedKey);
    entries.push(
      ...products.map((product) => ({
        url: `${BASE_URL}/${product.account_id}/${product.product_id}`,
        lastModified: product.updated_at,
      }))
    );
    lastEvaluatedKey = nextKey;
  } while (lastEvaluatedKey);

  return entries;
}
