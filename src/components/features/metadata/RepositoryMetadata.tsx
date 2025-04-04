import type { Metadata } from 'next';
import type { Repository } from '@/types';
import { CONFIG } from "@/lib/config";

interface RepositoryMetadataProps {
  repository: Repository;
}

export function generateRepositoryMetadata({ 
  repository 
}: RepositoryMetadataProps): Metadata {
  const title = `${repository.title} · ${repository.account.name} · Source Cooperative`;
  const description = repository.description || `A data repository by ${repository.account.name}`;
  const url = `https://source.coop/${repository.account.account_id}/${repository.repository_id}`;
  
  // Generate OG image URL
  const ogImageUrl = new URL('/api/og', 'https://source.coop');
  ogImageUrl.searchParams.set('title', repository.title);
  ogImageUrl.searchParams.set('author', repository.account.name);
  ogImageUrl.searchParams.set('type', 'repository');

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