import { Repository } from '@/types/repository';
import { RepositoryObject } from '@/types/repository_object';
import { Container, Heading, Text, Flex, Card, Box } from '@radix-ui/themes';
import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { fetchRepositories } from '@/lib/db/operations';
import { createStorageClient } from '@/lib/clients/storage';
import { ObjectBrowser } from '@/components/ObjectBrowser';
import Link from 'next/link';

// Define valid metadata types
type MetadataType = keyof NonNullable<Repository['metadata_files']>;

interface PageProps {
  params: {
    account_id: string;
    repository_id: string;
  };
}

async function getRepository(accountId: string, repositoryId: string): Promise<Repository | null> {
  try {
    const repositories: Repository[] = await fetchRepositories();
    const repository = repositories.find(
      repo => repo.repository_id === repositoryId && repo.account_id === accountId
    );
    return repository || null;
  } catch (error) {
    console.error("Error fetching repository:", error);
    throw error;
  }
}

// Add a function to get objects
async function getObjects(accountId: string, repositoryId: string): Promise<RepositoryObject[]> {
  const client = createStorageClient();
  const rawObjects = await client.listObjects({ account_id: accountId, repository_id: repositoryId });
  
  return rawObjects.map(obj => {
    const path = obj.path || '';
    return {
      id: path,
      path,
      name: path.split('/').pop() || path,
      size: obj.size,
      updated_at: obj.updated_at,
      repository_id: repositoryId,
      created_at: obj.updated_at ?? new Date().toISOString(),
      checksum: obj.checksum ?? '',
    } as RepositoryObject;
  });
}

export default async function RepositoryPage({
  params
}: PageProps) {
  const repository = await getRepository(params.account_id, params.repository_id);

  if (!repository) {
    notFound();
  }

  const objects: RepositoryObject[] = await getObjects(params.account_id, params.repository_id);

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
          initialPath=""
        />
      </Flex>
    </Container>
  );
} 