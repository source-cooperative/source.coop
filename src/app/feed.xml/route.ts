import { MetadataRoute } from 'next';
import { fetchRepositories } from '@/lib/db/operations_v2';

export async function GET() {
  try {
    // Fetch repositories for the feed
    const { repositories } = await fetchRepositories();
    
    // Generate RSS feed
    const feed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>Source.coop</title>
  <link>https://source.coop</link>
  <description>Latest repositories on Source.coop</description>
  ${repositories.map(repo => `
  <item>
    <title>${repo.title}</title>
    <link>https://source.coop/${repo.account_id}/${repo.repository_id}</link>
    <description>${repo.description}</description>
    <pubDate>${new Date(repo.created_at).toUTCString()}</pubDate>
  </item>
  `).join('\n')}
</channel>
</rss>`;

    // Return feed with proper content type
    return new Response(feed, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error generating feed:', error);
    return new Response('Error generating feed', { status: 500 });
  }
} 