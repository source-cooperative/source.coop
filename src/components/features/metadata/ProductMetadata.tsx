import type { Metadata } from "next";
import type { Product } from "@/types";
import { CONFIG } from "@/lib";
import { getBaseUrl } from "@/lib/baseUrl";

interface ProductMetadataProps {
  product: Product;
}

export async function generateProductMetadata({
  product,
}: ProductMetadataProps): Promise<Metadata> {
  // Handle case where account might be undefined
  const accountName = product.account?.name || "Unknown Account";
  const accountId = product.account?.account_id || "unknown";

  const baseUrl = await getBaseUrl();

  const title = `${product.title} · ${accountName} · Source Cooperative`;
  const description = product.description || `A data product by ${accountName}`;
  const url = `${baseUrl}/${accountId}/${product.product_id}`;

  // Generate OG image URL
  const ogImageUrl = new URL("/api/og", baseUrl);
  ogImageUrl.searchParams.set("type", "product");
  ogImageUrl.searchParams.set("account_id", accountId);
  ogImageUrl.searchParams.set("product_id", product.product_id);

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
      siteName: "Source Cooperative",
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