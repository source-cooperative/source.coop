import { Container, Heading, Text, Card, Flex, Box } from '@radix-ui/themes';
import { notFound } from 'next/navigation';
import { MonoText } from '@/components/MonoText';
import { createStorageClient } from '@/lib/clients/storage';
import { fetchObject } from '@/lib/api/objects';
import { RepositoryObject } from '@/types/repository_object';

interface PageProps {
  params: {
    account_id: string;
    repository_id: string;
    path: string[];
  };
}


export default async function ObjectPage({ params }: PageProps) {
  try {
    const pathString = params.path.join('/');
    const object: Partial<RepositoryObject> = await fetchObject(params.account_id, params.repository_id, pathString);
    
    return (
      <div>
        {/* Your object viewer component */}
        <h1>Viewing object: {pathString}</h1>
        <pre>{JSON.stringify(object, null, 2)}</pre>
        
        {/* Example of using object properties with type safety */}
        {object.size !== undefined && (
          <p>Size: {formatBytes(object.size)}</p>
        )}
      </div>
    );
  } catch (error) {
    return notFound();
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
} 