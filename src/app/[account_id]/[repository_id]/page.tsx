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
import type { Repository, RepositoryObject } from '@/types';
import { fetchRepositories } from '@/lib/db/operations';
import { createStorageClient } from '@/lib/clients/storage';

interface PageProps {
  params: Promise<{ account_id: string; repository_id: string }>
}

interface StorageResult {
  content?: {
    content?: string;
    metadata?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}

export default async function RepositoryPage({ params }: PageProps) {
  // 1. Get params
  const { account_id, repository_id } = await params;

  // 2. Find the repository or 404
  const repository: Repository = await fetchRepositories().then(repos => {
    const repo = repos.find(r => 
      r.account.account_id === account_id && 
      r.repository_id === repository_id
    );
    if (!repo) notFound();
    return repo;
  });

  // 3. Get objects from storage
  const objects: RepositoryObject[] = await createStorageClient().listObjects({ account_id, repository_id })
    .then(objects => objects
      .filter(obj => obj.path)
      .map(obj => ({
        id: obj.path!, // We know path exists from filter
        repository_id,
        path: obj.path!,
        size: obj.size || 0,
        type: obj.type || 'file',
        mime_type: obj.mime_type || '',
        created_at: new Date().toISOString(), // Default to now
        updated_at: new Date().toISOString(),
        checksum: obj.checksum || '', // Default to empty string
      }))
    );

  // 4. Get README if it exists
  const storage = createStorageClient();
  let readmeContent: string | undefined;

  try {
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
  } catch (error) {
    console.error('Error fetching repository contents:', error);
    // Still show the page but with empty contents
  }

  // 5. Render the page
  return (
    <Container>
      <RepositoryHeader repository={repository} />
      
      <Box mt="4">
        <ObjectBrowser 
          repository={repository}
          objects={objects}
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