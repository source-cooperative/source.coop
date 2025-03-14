import { fetchRepositories } from '@/lib/db/operations';

export async function GET() {
  const repositories = await fetchRepositories();
  
  const feed = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0">
      <channel>
        <title>Source Cooperative - Latest Repositories</title>
        <link>https://source.coop</link>
        <description>Latest data repositories on Source Cooperative</description>
        ${repositories.map(repo => `
          <item>
            <title>${repo.title}</title>
            <link>https://source.coop/${repo.account.account_id}/${repo.repository_id}</link>
            <description>${repo.description}</description>
            <pubDate>${new Date(repo.created_at).toUTCString()}</pubDate>
          </item>
        `).join('')}
      </channel>
    </rss>`;

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  });
} 