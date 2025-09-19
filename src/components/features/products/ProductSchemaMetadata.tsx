import type { Product } from "@/types";
import { productUrl } from "@/lib/urls";

// For injecting schema.org metadata
export function ProductSchemaMetadata({ product }: { product: Product }) {
  const account = product.account;
  const schemaData = {
    "@context": "https://schema.org/",
    "@type": "Dataset",
    name: product.title,
    description: product.description,
    url: account
      ? `https://yourdomain.com${productUrl(
          account.account_id,
          product.product_id
        )}`
      : "",
    dateModified: product.updated_at,
    dateCreated: product.created_at,
    isAccessibleForFree: product.visibility === "public",
    ...(account && {
      creator: {
        "@type": account.type === "organization" ? "Organization" : "Person",
        name: account.name,
        // TODO: Implement this
        // ...(account.metadata_public?.domains?.[0]?.domain && {
        //   url: `https://${account.metadata_public.domains[0].domain}`, // Assuming https
        // }),
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}
