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
import { Container, Box, Text } from '@radix-ui/themes';
import { notFound } from 'next/navigation';

// Internal components
import { ObjectBrowser, RepositoryHeader } from '@/components/features/repositories';

// Types
import type { _Repository, RepositoryObject } from '@/types';

// Utilities
import { fetchRepository } from '@/lib/db';
import { createStorageClient } from '@/lib/clients/storage';

interface PageProps {
  params: {
    account_id: string;
    repository_id: string;
    path?: string[];
  };
}

export default async function RepositoryPathPage({
  params
}: PageProps) {
  // 1. Get and await params
  const { account_id, repository_id, path } = await Promise.resolve(params);
  const pathString = path?.join('/') || '';
  
  console.log('Debug - Page params:', { account_id, repository_id, path, pathString });

  // 2. Find the repository or 404
  const repository = await fetchRepository(repository_id, account_id);
  console.log('Debug - Repository:', repository);
  
  if (!repository) {
    console.log('Debug - Repository not found, returning 404');
    return notFound();
  }

  try {
    // 3. Get objects from storage
    console.log('Debug - Fetching objects with:', { account_id, repository_id, object_path: pathString, prefix: pathString });
    const result = await createStorageClient().listObjects({
      account_id,
      repository_id,
      object_path: pathString, // Required by interface but not used by local storage
      prefix: pathString // Used for filtering files
    });
    console.log('Debug - Storage result:', result);

    // 4. Transform storage objects to repository objects
    const repositoryObjects: RepositoryObject[] = (result?.objects || [])
      .filter(obj => obj?.path)
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
      }));
    console.log('Debug - Transformed objects:', repositoryObjects);

    // 5. Find the selected object if we have a path
    const selectedObject = pathString ? repositoryObjects.find(obj => obj.path === pathString) : undefined;
    console.log('Debug - Selected object:', selectedObject);

    // 6. Determine if we're viewing a file or directory
    const isFile = selectedObject && selectedObject.type === 'file';
    const parentPath = isFile ? pathString.slice(0, pathString.lastIndexOf('/')) : pathString;
    console.log('Debug - Path info:', { isFile, parentPath });

    // 7. Render the page
    return (
      <Container>
        <RepositoryHeader repository={repository} />
        <Box mt="4">
          <ObjectBrowser
            repository={repository}
            objects={repositoryObjects}
            initialPath={parentPath}
            selectedObject={selectedObject}
          />
        </Box>
      </Container>
    );
  } catch (error) {
    console.error('Debug - Error:', error);
    // Handle errors by showing an error message
    return (
      <Container>
        <RepositoryHeader repository={repository} />
        <Box mt="4">
          <Text role="alert" color="red" size="3">
            {error instanceof Error ? error.message : 'An error occurred while loading repository contents'}
          </Text>
        </Box>
      </Container>
    );
  }
} 