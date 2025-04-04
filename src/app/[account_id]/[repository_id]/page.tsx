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

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Container, Box } from '@radix-ui/themes';
import { fetchRepository } from '@/lib/db/operations_v2';
import { RepositoryHeader } from '@/components/features/repositories';
import { ObjectBrowser } from '@/components/features/repositories';
import { createStorageClient } from '@/lib/clients/storage';
import type { RepositoryObject } from '@/types/repository_object';
import { MarkdownViewer } from '@/components/features/markdown/MarkdownViewer';

interface RepositoryPageProps {
  params: Promise<{
    account_id: string;
    repository_id: string;
  }>;
}

export default async function RepositoryPage({ params }: RepositoryPageProps) {
  // Await params before destructuring as required by Next.js 15+
  const { account_id, repository_id } = await Promise.resolve(params);
  
  try {
    const repository = await fetchRepository(account_id, repository_id);
    if (!repository) {
      return notFound();
    }

    // Get objects from storage
    const result = await createStorageClient().listObjects({
      account_id,
      repository_id,
      object_path: '',
      prefix: ''
    });

    // Transform storage objects to repository objects
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

    // Check for README.md file
    const readmeFile = repositoryObjects.find(obj => 
      obj.path.toLowerCase() === 'readme.md' || 
      obj.path.toLowerCase() === 'readme'
    );

    let readmeContent = '';
    
    // If README.md exists, fetch its content
    if (readmeFile) {
      try {
        const storageClient = createStorageClient();
        const readmeResult = await storageClient.getObject({
          account_id,
          repository_id,
          object_path: readmeFile.path
        });
        
        // Convert buffer to string
        readmeContent = readmeResult.data.toString('utf-8');
      } catch (error) {
        console.error('Error fetching README content:', error);
        // Continue without README if there's an error
      }
    }

    return (
      <Container>
        <RepositoryHeader repository={repository} />
        
        <Box mt="4">
          <ObjectBrowser
            repository={repository}
            objects={repositoryObjects}
            initialPath=""
          />
        </Box>

        {/* Display README if available */}
        {readmeContent && (
          <Box mt="4">
            <MarkdownViewer content={readmeContent} />
          </Box>
        )}
      </Container>
    );
  } catch (error) {
    console.error('Error fetching repository:', error);
    return notFound();
  }
}

// Basic metadata
export async function generateMetadata({ params }: RepositoryPageProps): Promise<Metadata> {
  // Await params before destructuring as required by Next.js 15+
  const { account_id, repository_id } = await Promise.resolve(params);
  
  try {
    const repository = await fetchRepository(account_id, repository_id);
    if (!repository) {
      return {
        title: 'Repository Not Found',
        description: 'The requested repository could not be found.'
      };
    }
    
    return {
      title: repository.title,
      description: repository.description || `Repository: ${repository.title}`
    };
  } catch (error) {
    return {
      title: 'Error',
      description: 'An error occurred while fetching the repository.'
    };
  }
} 