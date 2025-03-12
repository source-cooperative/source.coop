import { Container, Heading, Text, Card, Flex, Box } from '@radix-ui/themes';
import { notFound } from 'next/navigation';
import { MonoText } from '@/components/MonoText';
import { LocalStorageClient } from '@/lib/storage/local';
import { fetchObjects, fetchObject } from '@/lib/api';

interface PageProps {
  params: {
    account_id: string;
    repository_id: string;
    path: string[];
  };
}

async function getObjectInfo(accountId: string, repositoryId: string, objectPath: string) {
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
    const stats = await storage.getObjectInfo({
      account_id: accountId,
      repository_id: repositoryId,
      object_path: objectPath
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting object info:', error);
    return null;
  }
}

export default async function ObjectPage({ params }: PageProps) {
  try {
    const pathString = params.path.join('/');
    const object = await fetchObject(params.account_id, params.repository_id, pathString);
    
    return (
      <div>
        {/* Your object viewer component */}
        <h1>Viewing object: {pathString}</h1>
        <pre>{JSON.stringify(object, null, 2)}</pre>
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