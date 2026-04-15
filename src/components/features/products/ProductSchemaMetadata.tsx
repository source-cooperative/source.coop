import type { Product } from "@/types";
import { accountUrl, productUrl } from "@/lib/urls";
import { getBaseUrl } from "@/lib/baseUrl";

export async function ProductSchemaMetadata({ product }: { product: Product }) {
  const account = product.account;
  const baseUrl = await getBaseUrl();

  const creator = account
    ? {
        "@type": account.type === "organization" ? "Organization" : "Person",
        name: account.name,
        url: `${baseUrl}${accountUrl(account.account_id)}`,
        ...(account.type === "individual" && account.metadata_public?.orcid
          ? { sameAs: `https://orcid.org/${account.metadata_public.orcid}` }
          : {}),
        ...(account.type === "organization" && account.metadata_public?.ror_id
          ? { sameAs: `https://ror.org/${account.metadata_public.ror_id}` }
          : {}),
      }
    : undefined;

  const schemaData = {
    "@context": "https://schema.org/",
    "@type": "Dataset",
    name: product.title,
    description: product.description,
    url: account
      ? `${baseUrl}${productUrl(account.account_id, product.product_id)}`
      : "",
    dateModified: product.updated_at,
    dateCreated: product.created_at,
    isAccessibleForFree: product.visibility === "public",
    ...(product.metadata?.doi && {
      identifier: `https://doi.org/${product.metadata.doi}`,
    }),
    ...(creator && { creator }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}
