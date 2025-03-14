import { Container, Flex, Box } from '@radix-ui/themes';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

import { 
  ObjectBrowser, 
  MarkdownViewer, 
  RepositoryHeader,
  RepositorySchemaMetadata 
} from '@/components';

import type { Repository, RepositoryObject } from '@/types';

import { fetchRepositories } from '@/lib/db/operations';
import { createStorageClient } from '@/lib/clients/storage';
import { generateRepositoryMetadata, RepositorySchema } from '@/components/metadata';

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

// Function to get the README content
async function getReadmeContent(accountId: string, repositoryId: string, path?: string): Promise<string | null> {
  try {
    const client = createStorageClient();
    const prefix = path ? `${path}/` : '';
    const readmePath = `${prefix}README.md`;
    
    // Check if README.md exists
    const objects = await client.listObjects({ 
      account_id: accountId, 
      repository_id: repositoryId,
      prefix: readmePath
    });
    
    if (objects.length === 0) {
      // If no README in current path and we're not at root, try root
      if (path) {
        return getReadmeContent(accountId, repositoryId);
      }
      return null;
    }
    
    // Fetch README.md content
    const readmeObject = await client.getObject({
      account_id: accountId,
      repository_id: repositoryId,
      path: readmePath
    });
    
    // Convert the content to string based on the actual return type
    // Adjust this based on what getObject actually returns
    return readmeObject.content?.toString() || null;
  } catch (error) {
    console.error("Error fetching README:", error);
    return null;
  }
}

async function getData(params: PageProps['params']) {
  const repository = await getRepository(params.account_id, params.repository_id);
  if (!repository) {
    notFound();
  }

  return { repository };  // No need to fetch account separately anymore
}

// Generate metadata for the page
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const repository = await getRepository(params.account_id, params.repository_id);
  if (!repository) {
    notFound();
  }

  // Generate basic metadata
  const metadata = generateRepositoryMetadata({ repository });

  // Add JSON-LD schema
  return {
    ...metadata,
    openGraph: metadata.openGraph,
    twitter: metadata.twitter,
    other: {
      schema: JSON.stringify({
        "@context": "https://schema.org/",
        "@type": "Dataset",
        "name": repository.title,
        "description": repository.description,
        "url": `https://source.coop/${repository.account.account_id}/${repository.repository_id}`,
        "dateModified": repository.updated_at,
        "dateCreated": repository.created_at,
        "isAccessibleForFree": !repository.private,
        ...(repository.root_metadata?.license && {
          "license": repository.root_metadata.license
        }),
        "creator": {
          "@type": repository.account.type === 'organization' ? "Organization" : "Person",
          "name": repository.account.name,
          ...(repository.account.website && { "url": repository.account.website })
        }
      })
    }
  };
}

export default async function RepositoryPage({ params }: PageProps) {
  const repository = await getRepository(params.account_id, params.repository_id);
  if (!repository) {
    notFound();
  }

  const readmeContent = await getReadmeContent(params.account_id, params.repository_id);
  const objects = await getObjects(params.account_id, params.repository_id);

  return (
    <>
      <RepositorySchema repository={repository} />
      <Container>
        <Box>
          <RepositoryHeader repository={repository} />
        </Box>

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
    </>
  );
} 