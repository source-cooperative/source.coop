import { MetadataRoute } from 'next';
import { CONFIG } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  // Preview and staging deployments duplicate production's content, so only
  // production invites crawlers.
  if (!CONFIG.environment.isProduction) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: {
      userAgent: '*',
      // Crawlers apply the longest matching rule, so `/_next/` keeps page
      // assets crawlable despite `/*/*/`.
      allow: ['/', '/_next/'],
      disallow: [
        '/api/',
        // Everything below /{account}/{product}: the file browser is an
        // unbounded tree of listings, and the product page is what the
        // sitemap offers for indexing.
        '/*/*/',
      ],
    },
    sitemap: 'https://source.coop/sitemap.xml',
  };
}
