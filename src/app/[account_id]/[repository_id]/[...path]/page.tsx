/**
 * Repository Path Page - Displays repository contents at a specific path
 * 
 * KEEP IT SIMPLE:
 * 1. URL params are known values (/[account_id]/[repository_id]/[...path])
 * 2. Get data -> Transform if needed -> Render
 * 3. Trust your types, avoid complex validation
 * 4. Let Next.js handle errors (404, 500, etc.)
 * 5. No helper functions unless truly needed
 */

// External packages
import { Container, Box } from '@radix-ui/themes';
import { notFound } from 'next/navigation';

// Internal components
import { ObjectBrowser } from '@/components/features/repositories/ObjectBrowser';
import { RepositoryHeader } from '@/components/features/repositories/RepositoryHeader';

// Types
import type { Repository, RepositoryObject } from '@/types';

// Utilities
import { fetchRepositories } from '@/lib/db/operations';
import { createStorageClient } from '@/lib/clients/storage';

// Page Props Type
type PageProps = {
  params: Promise<{
    account_id: string;
    repository_id: string;
    path: string[];
  }>;
};

/**
 * Detect if a path represents a directory by:
 * 1. Checking if it has an explicit directory type
 * 2. Checking if any objects exist under this path
 * This handles cases like:
 * - /climate.zarr/ (directory with file-like name)
 * - /path.with.dots/nested/files (paths with dots)
 * - /path/with/trailing/slash/ (normalize slashes)
 */
function isDirectory(objects: RepositoryObject[], path: string): boolean {
  // Normalize path to not end with slash for comparison
  const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
  
  // First check if we have an explicit directory type
  const exactMatch = objects.find(obj => {
    const objPath = obj.path.endsWith('/') ? obj.path.slice(0, -1) : obj.path;
    return objPath === normalizedPath;
  });
  if (exactMatch?.type === 'directory') return true;
  
  // Then check if any objects exist under this path
  const prefix = normalizedPath + '/';
  return objects.some(obj => obj.path.startsWith(prefix));
}

export default async function RepositoryPathPage({
  params
}: PageProps) {
  const { account_id, repository_id, path } = await params;
  const pathString = path?.join('/') || '';

  // Parallel data fetching
  const [repository, objects] = await Promise.all([
    // Get repository
    fetchRepositories().then(repos => {
      const repo = repos.find(r => 
        r.account.account_id === account_id && 
        r.repository_id === repository_id
      );
      if (!repo) notFound();
      return repo;
    }),

    // Get objects
    createStorageClient().listObjects({ account_id, repository_id })
      .then(objects => objects
        .filter(obj => obj.path)
        .map(obj => ({
          id: obj.path!,
          repository_id,
          path: obj.path!,
          size: obj.size || 0,
          type: obj.type || 'file',
          mime_type: obj.mime_type || '',
          created_at: obj.created_at || new Date().toISOString(),
          updated_at: obj.updated_at || new Date().toISOString(),
          checksum: obj.checksum || '',
          metadata: obj.metadata || {}
        }))
      )
  ]);

  // If we have a path, verify it exists
  if (pathString) {
    const object = objects.find(obj => obj.path === pathString);
    const isDir = isDirectory(objects, pathString);
    
    // Only 404 if it's not a directory and we can't find the file
    if (!isDir && !object) {
      notFound();
    }
  }

  return (
    <Container>
      <RepositoryHeader repository={repository} />
      <Box mt="4">
        <ObjectBrowser
          repository={repository}
          objects={objects}
          initialPath={pathString}
          selectedObject={objects.find(obj => obj.path === pathString)}
        />
      </Box>
    </Container>
  );
} 