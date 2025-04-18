import type { Metadata } from 'next';
import type { Product_v2 } from '@/types/product_v2';
import { CONFIG } from "@/lib/config";

interface ProductMetadataProps {
  product: Product_v2;
}

export function generateProductMetadata({ 
  product 
}: ProductMetadataProps): Metadata {
  // Handle case where account might be undefined
  const accountName = product.account?.name || 'Unknown Account';
  const accountId = product.account?.account_id || 'unknown';
  
  const title = `${product.title} · ${accountName} · Source Cooperative`;
  const description = product.description || `A data product by ${accountName}`;
  const url = `https://source.coop/${accountId}/${product.product_id}`;
  
  // Generate OG image URL
  const ogImageUrl = new URL('/api/og', 'https://source.coop');
  ogImageUrl.searchParams.set('title', product.title);
  ogImageUrl.searchParams.set('author', accountName);
  ogImageUrl.searchParams.set('type', 'product');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url,
      images: [
        {
          url: ogImageUrl.toString(),
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl.toString()],
    },
    other: {
      "google-site-verification": CONFIG.google.siteVerification,
    },
    // Schema.org metadata as JSON-LD
    alternates: {
      canonical: url,
    },
  };
} 