import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'], // Prevent crawling of API routes
    },
    sitemap: 'https://source.coop/sitemap.xml',
  };
} 