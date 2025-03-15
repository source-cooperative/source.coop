import type { Metadata } from 'next';
import type { Account } from '@/types';

interface AccountMetadataProps {
  account: Account;
}

export function generateAccountMetadata({ account }: AccountMetadataProps): Metadata {
  const title = `${account.name} · Source Cooperative`;
  const description = account.description || 
    `${account.type === 'organization' ? 'Organization' : 'Individual'} account on Source Cooperative`;
  const url = `https://source.coop/${account.account_id}`;

  // Generate OG image URL
  const ogImageUrl = new URL('/api/og', 'https://source.coop');
  ogImageUrl.searchParams.set('title', account.name);
  ogImageUrl.searchParams.set('type', account.type);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      url,
      images: [{
        url: ogImageUrl.toString(),
        width: 1200,
        height: 630,
        alt: title,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl.toString()],
    },
    alternates: {
      canonical: url,
    }
  };
} 