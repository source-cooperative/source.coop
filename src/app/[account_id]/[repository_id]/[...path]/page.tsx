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
import { Container, Flex, Box, Grid } from '@radix-ui/themes';
import { notFound } from 'next/navigation';

// Internal components
import { ObjectBrowser } from '@/components/features/repositories/ObjectBrowser';
import { RepositoryHeader } from '@/components/features/repositories/RepositoryHeader';

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
    checksum: obj.checksum || '',
    metadata: obj.metadata
  }));
}

async function getObjectWithMetadata(accountId: string, repositoryId: string, objectPath: string): Promise<RepositoryObject | undefined> {
  const client = createStorageClient();
  
  try {
    const response = await fetch(
      `http://localhost:3000/api/${accountId}/${repositoryId}/objects/${objectPath}`
    );
    
    if (!response.ok) {
      console.error('Failed to fetch object metadata:', response.status);
      return undefined;
    }
    
    const data = await response.json();
    return {
      id: data.id,
      repository_id: data.repository_id,
      path: data.path,
      size: data.size,
      type: data.type,
      mime_type: data.mime_type,
      created_at: data.created_at,
      updated_at: data.updated_at,
      checksum: data.checksum || '',
      metadata: data.metadata
    };
  } catch (error) {
    console.error('Error fetching object metadata:', error);
    return undefined;
  }
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
  console.log('Page params:', { account_id, repository_id, path });
  
  const repository = await getRepository(account_id, repository_id);
  
  if (!repository) {
    notFound();
  }
  
  const objects = await getObjects(account_id, repository_id);
  console.log('Found objects:', objects);
  
  const currentPath = Array.isArray(path) ? path.join('/') : '';
  console.log('Current path:', currentPath);
  
  const directory = await isDirectory(objects, currentPath);
  console.log('Is directory:', directory);
  
  let selectedObject;
  if (!directory) {
    // Fetch full object metadata when viewing a specific file
    selectedObject = await getObjectWithMetadata(account_id, repository_id, currentPath);
    console.log('Selected object with metadata:', selectedObject);
  }
  
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