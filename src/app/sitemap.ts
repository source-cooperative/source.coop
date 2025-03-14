import { MetadataRoute } from 'next';
import { fetchAccounts, fetchRepositories } from '@/lib/db/operations';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://source.coop';
  
  // Fetch all data needed for URLs
  const [accounts, repositories] = await Promise.all([
    fetchAccounts(),
    fetchRepositories()
  ]);

  // Start with homepage
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    }
  ];

  // Add account pages
  accounts.forEach((account) => {
    routes.push({
      url: `${baseUrl}/${account.account_id}`,
      lastModified: new Date(account.updated_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  });

  // Add repository pages
  repositories.forEach((repository) => {
    routes.push({
      url: `${baseUrl}/${repository.account.account_id}/${repository.repository_id}`,
      lastModified: new Date(repository.updated_at),
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  });

  return routes;
} 