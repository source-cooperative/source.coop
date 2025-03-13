import { Container, Heading, Flex, Card, Box } from '@radix-ui/themes';
import { notFound } from 'next/navigation';
import { fetchRepositories, fetchAccounts } from '@/lib/db/operations';
import { createStorageClient } from '@/lib/clients/storage';
import { 
  ObjectBrowser, 
  MarkdownViewer, 
  RepositoryHeader, 
  RepositoryMetaCard, 
  RepositorySchemaMetadata 
} from '@/components';
import type { Repository } from '@/types/repository';
import type { RepositoryObject } from '@/types/repository_object';

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

  const accounts = await fetchAccounts();
  const account = accounts.find(acc => acc.account_id === repository.account_id);

  return {
    repository,
    account
  };
}

export default async function RepositoryPage({ params }: PageProps) {
  const { repository, account } = await getData(params);
  const readmeContent = await getReadmeContent(params.account_id, params.repository_id);
  const objects = await getObjects(params.account_id, params.repository_id);

  return (
    <>
      <RepositorySchemaMetadata repository={repository} account={account} />
      <Container>
        <Flex direction="column" gap="6">
          <RepositoryHeader repository={repository} account={account} />
          <Box>
            <RepositoryMetaCard repository={repository} />
          </Box>

          <Flex direction="column" gap="4">
            <ObjectBrowser 
              account_id={params.account_id} 
              repository_id={params.repository_id} 
              objects={objects}
              initialPath=""
              repository_title={repository.title}
            />

            {readmeContent && (
              <Card>
                <Heading size="4" mb="2">README</Heading>
                <Box>
                  <MarkdownViewer content={readmeContent} />
                </Box>
              </Card>
            )}
          </Flex>
        </Flex>
      </Container>
    </>
  );
} 