/**
 * Repository Page - Displays a repository and its contents
 * 
 * KEEP IT SIMPLE:
 * 1. URL params are known values (/[account_id]/[repository_id])
 * 2. Get data -> Transform if needed -> Render
 * 3. Trust your types, avoid complex validation
 * 4. Let Next.js handle errors (404, 500, etc.)
 * 5. No helper functions unless truly needed
 */

// External packages
import { Container, Box } from '@radix-ui/themes';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

// Internal components
import { RepositoryHeader, ObjectBrowser } from '@/components/features/repositories';
import { MarkdownViewer } from '@/components/features/markdown/MarkdownViewer';

// Types and utilities
import type { Repository } from '@/types';
import { fetchRepositories } from '@/lib/db/operations';
import { createStorageClient } from '@/lib/clients/storage';

interface PageProps {
  params: { account_id: string; repository_id: string }
}

interface StorageResult {
  content?: {
    content?: string;
    metadata?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}

export default async function RepositoryPage({ params }: PageProps) {
  // 1. Await params and destructure
  const { account_id, repository_id } = await Promise.resolve(params);

  // 2. Find the repository or 404
  const repository = (await fetchRepositories()).find(repo => 
    repo.repository_id === repository_id && 
    repo.account.account_id === account_id
  );

  if (!repository) notFound();

  // 3. Get the repository contents
  const storage = createStorageClient();
  const objects = await storage.listObjects({
    account_id,
    repository_id
  });

  // 4. Get README content if it exists
  let readmeContent: string | undefined;
  const hasReadme = objects.some(obj => obj.path === 'README.md');
  
  if (hasReadme) {
    const result = await storage.getObject({
      account_id,
      repository_id,
      path: 'README.md'
    }) as StorageResult;
    
    if (result?.content?.content && typeof result.content.content === 'string') {
      readmeContent = result.content.content;
    }
  }

  // 5. Render the page
  return (
    <Container>
      <RepositoryHeader repository={repository} />
      
      <Box mt="4">
        <ObjectBrowser 
          repository={repository}
          objects={objects.map(obj => ({
            id: obj.path || '',
            repository_id,
            path: obj.path || '',
            size: obj.size || 0,
            type: obj.type || 'file',
            mime_type: obj.mime_type,
            created_at: obj.created_at || new Date().toISOString(),
            updated_at: obj.updated_at || new Date().toISOString(),
            checksum: obj.checksum || ''
          }))}
          initialPath=""
        />
      </Box>

      {readmeContent && (
        <Box mt="4">
          <MarkdownViewer content={readmeContent} />
        </Box>
      )}
    </Container>
  );
}

// Basic metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { account_id, repository_id } = await Promise.resolve(params);
  return {
    title: `${account_id}/${repository_id}`,
    description: `Repository ${account_id}/${repository_id}`
  };
} 