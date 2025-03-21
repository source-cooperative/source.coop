import { MetadataRoute } from 'next';
import { fetchRepositories } from '@/lib/db/operations';

export async function GET() {
  try {
    // Fetch repositories for the feed
    const repositories = await fetchRepositories();
    
    // Generate RSS feed
    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Source Cooperative - Latest Repositories</title>
    <link>https://source.coop</link>
    <description>Latest data repositories from Source Cooperative</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://source.coop/feed.xml" rel="self" type="application/rss+xml" />
    ${repositories
      .filter(repo => !repo.private) // Only include public repositories
      .map(repo => `
    <item>
      <title>${repo.title}</title>
      <link>https://source.coop/${repo.account.account_id}/${repo.repository_id}</link>
      <guid>https://source.coop/${repo.account.account_id}/${repo.repository_id}</guid>
      <description>${repo.description || 'No description available'}</description>
      <pubDate>${new Date(repo.created_at).toUTCString()}</pubDate>
      <author>${repo.account.account_id}</author>
    </item>
    `).join('')}
  </channel>
</rss>`;

    return new Response(feed, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return new Response('Error generating feed', { status: 500 });
  }
} 