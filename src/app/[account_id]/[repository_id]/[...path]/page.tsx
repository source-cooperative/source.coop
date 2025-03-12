import { Repository } from '@/types/repository';
import { RepositoryObject, RepositoryObjectType } from '@/types/repository_object';
import { Container, Heading, Text, Flex, Card, Box, Button } from '@radix-ui/themes';
import { notFound } from 'next/navigation';
import { fetchRepositories } from '@/lib/db/operations';
import { createStorageClient } from '@/lib/clients/storage';
import { ObjectBrowser } from '@/components/ObjectBrowser';
import Link from 'next/link';
import { FileIcon, DownloadIcon } from '@radix-ui/react-icons';

interface PageProps {
  params: {
    account_id: string;
    repository_id: string;
    path: string[];
  };
}

async function getRepository(accountId: string, repositoryId: string): Promise<Repository | null> {
  const repositories = await fetchRepositories();
  return repositories.find(repo => 
    repo.account_id === accountId && repo.repository_id === repositoryId
  ) || null;
}

async function getObjects(accountId: string, repositoryId: string): Promise<RepositoryObject[]> {
  const client = createStorageClient();
  
  // Need to handle the potential for partial objects
  const objects = await client.listObjects({ account_id: accountId, repository_id: repositoryId });
  
  // Convert partial objects to full repository objects
  // This ensures all required properties are present
  return objects.map(obj => ({
    id: obj.id || '',
    repository_id: obj.repository_id || '',
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
  const repository = await getRepository(params.account_id, params.repository_id);
  
  if (!repository) {
    notFound();
  }
  
  const objects: RepositoryObject[] = await getObjects(params.account_id, params.repository_id);
  const path = params.path.join('/');
  
  // Check if the path is a directory or a file
  const directory = await isDirectory(objects, path);
  
  // Find the selected object if we're viewing a file
  const selectedObject = !directory ? objects.find(obj => obj.path === path) : undefined;
  
  return (
    <Container>
      <Heading size="8" mb="4">{repository.title}</Heading>
      <Text mb="4">{repository.description}</Text>
      
      <Flex direction="column" gap="4">
        <Heading size="4">Repository Contents</Heading>
        <ObjectBrowser 
          account_id={params.account_id} 
          repository_id={params.repository_id} 
          objects={objects}
          initialPath={directory ? path : path.split('/').slice(0, -1).join('/')}
          selectedObject={selectedObject}
        />
      </Flex>
    </Container>
  );
} 