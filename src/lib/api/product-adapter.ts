import { Product } from "@/types/product_v2";
import { RepositoryDataMode, RepositoryState } from "@/types";

// Adapter function to convert Product to Repository format for testing
export function productToRepository(product: Product): any {
  return {
    account_id: product.account_id,
    repository_id: product.product_id,
    state:
      product.visibility === "public"
        ? RepositoryState.Listed
        : RepositoryState.Unlisted,
    data_mode:
      product.visibility === "restricted"
        ? RepositoryDataMode.Private
        : RepositoryDataMode.Open,
    featured: 0,
    meta: {
      title: product.title,
      description: product.description,
      tags: product.metadata.tags || [],
    },
    data: {
      primary_mirror: product.metadata.primary_mirror,
      mirrors: Object.entries(product.metadata.mirrors).reduce(
        (acc, [key, mirror]) => {
          acc[key] = {
            data_connection_id: mirror.connection_id,
            prefix: mirror.prefix,
          };
          return acc;
        },
        {} as any
      ),
    },
    published: product.created_at,
    disabled: false, // Products don't have disabled state in new schema
  };
}
