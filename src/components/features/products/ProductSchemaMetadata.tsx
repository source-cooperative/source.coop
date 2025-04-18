import type { Product_v2 } from '@/types/product_v2';

// For injecting schema.org metadata
export function ProductSchemaMetadata({ 
  product, 
}: { 
  product: Product_v2;
}) {
  const account = product.account;
  const schemaData = {
    "@context": "https://schema.org/",
    "@type": "Dataset",
    "name": product.title,
    "description": product.description,
    "url": account ? `https://yourdomain.com/${account.account_id}/${product.product_id}` : '',
    "dateModified": product.updated_at,
    "dateCreated": product.created_at,
    "isAccessibleForFree": product.visibility === 'public',
    ...(account && {
      "creator": {
        "@type": account.type === 'organization' ? "Organization" : "Person",
        "name": account.name,
        ...(account.metadata_public?.domains?.[0]?.domain && { 
          "url": `https://${account.metadata_public.domains[0].domain}` // Assuming https
        })
      }
    })
  };

  return (
    <script 
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
} 