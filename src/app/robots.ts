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
      allow: '/',
      disallow: ['/api/'], // Prevent crawling of API routes
    },
    sitemap: 'https://source.coop/sitemap.xml',
  };
}
