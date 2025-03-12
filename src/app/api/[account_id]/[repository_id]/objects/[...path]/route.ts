import { NextResponse } from 'next/server';
import { LocalStorageClient } from '@/lib/storage/local';

const getStorageClient = () => {
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

  return new LocalStorageClient(provider, config);
};

export async function GET(
  request: Request,
  { params }: { 
    params: { 
      account_id: string; 
      repository_id: string;
      path: string[];
    } 
  }
) {
  try {
    const storage = getStorageClient();
    const objectPath = params.path.join('/');
    
    // Get object info using the storage client
    const objectInfo = await storage.getObjectInfo({
      account_id: params.account_id,
      repository_id: params.repository_id,
      object_path: objectPath
    });

    if (!objectInfo) {
      return NextResponse.json(
        { error: 'Object not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: `${params.account_id}/${params.repository_id}/${objectPath}`,
      repository_id: params.repository_id,
      path: objectPath,
      size: objectInfo.size,
      updated_at: objectInfo.updated_at,
      created_at: new Date().toISOString(),
      checksum: ''
    });

  } catch (error) {
    console.error('Error getting object:', error);
    return NextResponse.json(
      { error: 'Failed to get object' },
      { status: 500 }
    );
  }
} 