import { Repository } from '@/types/repository';
import { Container, Heading, Text, Flex, Card, Box } from '@radix-ui/themes';
import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { fetchRepositories, fetchAccounts } from '@/lib/dynamodb';
import { ObjectBrowser } from '@/components/ObjectBrowser';
import { LocalStorageClient } from '@/lib/storage/local';

// Define valid metadata types
type MetadataType = keyof NonNullable<Repository['metadata_files']>;

// Helper function to fetch and type metadata
async function fetchMetadata<T>(
  repository: Repository, 
  metadataType: MetadataType,
  index = 0
): Promise<T | null> {
  const files = repository.metadata_files?.[metadataType];
  if (!files || !files[index]) return null;
  
  const response = await fetch(`/api/repositories/${repository.account_id}/${repository.repository_id}/files/${files[index]}`);
  return response.json();
}

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

async function listObjects(accountId: string, repositoryId: string) {
  // Create storage client with local config
  const provider = {
    provider_id: 'local',
    type: 'LOCAL' as const,
    endpoint: './test-storage',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const config = {
    type: 'LOCAL' as const,
    endpoint: './test-storage',
  };

  const storage = new LocalStorageClient(provider, config);
  
  try {
    // TODO: Implement listObjects in LocalStorageClient
    // For now, return the test data we created
    return [
      {
        path: 'README.md',
        size: 1024, // This will be actual size once implemented
        updated_at: new Date().toISOString()
      },
      {
        path: 'metadata/stac-catalog.json',
        size: 2048,
        updated_at: new Date().toISOString()
      }
    ];
  } catch (error) {
    console.error('Error listing objects:', error);
    return [];
  }
}

export default async function RepositoryPage({
  params
}: PageProps) {
  const repository = await getRepository(params.account_id, params.repository_id);

  if (!repository) {
    notFound();
  }

  const objects = await listObjects(params.account_id, params.repository_id);

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
        />
      </Flex>
    </Container>
  );
} 