import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/clients';

const getStorageClient = () => {
  return getStorage();
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
  console.log('API route handler:', { params });
  
  try {
    const storage = getStorage();
    console.log('Got storage client');
    
    const objectPath = params.path.join('/');
    console.log('Getting object info for path:', objectPath);
    
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
      size: objectInfo.size || 0,
      updated_at: objectInfo.updated_at || new Date().toISOString(),
      created_at: objectInfo.created_at || new Date().toISOString(),
      checksum: objectInfo.checksum || ''
    });

  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      { error: 'Failed to get object' },
      { status: 500 }
    );
  }
} 