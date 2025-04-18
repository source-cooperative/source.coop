import type { Product_v2 } from '@/types/product_v2';

interface ProductSchemaProps {
  product: Product_v2;
}

export function ProductSchema({ product }: ProductSchemaProps) {
  // Handle case where account might be undefined
  const accountName = product.account?.name || 'Unknown Account';
  const accountId = product.account?.account_id || 'unknown';
  const accountType = product.account?.type || 'Person';
  
  const schemaData = {
    "@context": "https://schema.org/",
    "@type": "Dataset",
    "name": product.title,
    "description": product.description,
    "url": `https://source.coop/${accountId}/${product.product_id}`,
    "dateModified": product.updated_at,
    "dateCreated": product.created_at,
    "isAccessibleForFree": product.visibility === 'public',
    ...(product.metadata?.tags && {
      "keywords": product.metadata.tags.join(', ')
    }),
    "creator": {
      "@type": accountType === 'organization' ? "Organization" : "Person",
      "name": accountName
    }
  };

  return (
    <script 
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
} 