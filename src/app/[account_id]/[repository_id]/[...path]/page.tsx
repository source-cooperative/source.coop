// External packages
import { Container, Flex, Box, Grid } from '@radix-ui/themes';
import { notFound } from 'next/navigation';

// Internal components
import { 
  ObjectBrowser, 
  RepositoryHeader 
} from '@/components';

// Types
import type { Repository, RepositoryObject } from '@/types';

// Utilities
import { fetchRepositories } from '@/lib/db/operations';
import { createStorageClient } from '@/lib/clients/storage';

interface PageProps {
  params: {
    account_id: string;
    repository_id: string;
    path: string[];
  };
}

async function getRepository(accountId: string, repositoryId: string): Promise<Repository | null> {
  try {
    const repositories = await fetchRepositories();
    return repositories.find(repo => 
      repo.repository_id === repositoryId && 
      repo.account.account_id === accountId
    ) || null;
  } catch (error) {
    console.error("Error fetching repository:", error);
    return null;
  }
}

async function getObjects(accountId: string, repositoryId: string): Promise<RepositoryObject[]> {
  const client = createStorageClient();
  
  const objects = await client.listObjects({ 
    account_id: accountId,  // Storage client still uses account_id
    repository_id: repositoryId 
  });
  
  return objects.map(obj => ({
    id: obj.path || '',
    repository_id: repositoryId,
    path: obj.path || '',
    size: obj.size || 0,
    type: obj.type || 'file',
    mime_type: obj.mime_type,
    created_at: obj.created_at || new Date().toISOString(),
    updated_at: obj.updated_at || new Date().toISOString(),
    checksum: obj.checksum || ''
  }));
}

async function isDirectory(objects: RepositoryObject[], path: string): Promise<boolean> {
  // First check if there's an object with this exact path that has type 'directory'
  const exactMatch = objects.find(obj => obj.path === path);
  if (exactMatch) {
    return exactMatch.type === 'directory';
  }

  // If no exact match or type is not available, check if any objects are "inside" this path
  const fullPath = path.endsWith('/') ? path : path + '/';
  return objects.some(obj => obj.path.startsWith(fullPath));
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default async function RepositoryPathPage({
  params
}: PageProps) {
  const { account_id, repository_id, path } = await Promise.resolve(params);
  const repository = await getRepository(account_id, repository_id);
  
  if (!repository) {
    notFound();
  }
  
  const objects = await getObjects(account_id, repository_id);
  const currentPath = Array.isArray(path) ? path.join('/') : '';
  
  const directory = await isDirectory(objects, currentPath);
  const selectedObject = !directory ? objects.find(obj => obj.path === currentPath) : undefined;
  
  return (
    <Container>
      <Flex direction="column" gap="4">
        <RepositoryHeader repository={repository} />

        <ObjectBrowser 
          repository={repository}
          objects={objects}
          initialPath={directory ? currentPath : currentPath.split('/').slice(0, -1).join('/')}
          selectedObject={selectedObject}
        />
      </Flex>
    </Container>
  );
} 