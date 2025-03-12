import { ObjectBrowser } from '@/components/ObjectBrowser';
import { notFound } from 'next/navigation';
import { createStorageClient } from '@/lib/clients/storage';
import { RepositoryObject } from '@/types/repository_object';

interface PageProps {
  params: {
    account_id: string;
    repository_id: string;
    path?: string[];
  };
}

export default async function BrowsePage({ params }: PageProps) {
  const path = params.path?.join('/') || '';
  
  try {
    const client = createStorageClient();
    const objects = await client.listObjects({ 
      account_id: params.account_id, 
      repository_id: params.repository_id,
      prefix: path
    }) as Array<Partial<RepositoryObject>>;
    
    const sortedObjects = objects?.sort?.((a, b) => {
      // Check if both objects have the type property and provide defaults
      const aIsDirectory = (a as { type?: string }).type === 'directory';
      const bIsDirectory = (b as { type?: string }).type === 'directory';
      
      if (aIsDirectory === bIsDirectory) {
        // Use nullish coalescing to provide empty string fallbacks
        return (a.path ?? '').localeCompare(b.path ?? '');
      }
      return aIsDirectory ? -1 : 1;
    }) || [];

    // Ensure all objects have the required properties
    const validObjects = sortedObjects.map(obj => ({
      path: obj.path || '',
      size: obj.size || 0,
      updated_at: obj.updated_at || '',
      type: obj.type,
      // Add missing required properties from RepositoryObject type
      id: obj.id || '',
      repository_id: obj.repository_id || params.repository_id,
      created_at: obj.created_at || obj.updated_at || '',
      checksum: obj.checksum || '',
    })) as RepositoryObject[];

    return (
      <ObjectBrowser 
        account_id={params.account_id}
        repository_id={params.repository_id}
        objects={validObjects}
        initialPath={path}
      />
    );
  } catch (error) {
    console.error('Error fetching objects:', error);
    return (
      <div>
        <h2>Error loading repository contents</h2>
        <pre>{(error as Error).message}</pre>
      </div>
    );
  }
} 