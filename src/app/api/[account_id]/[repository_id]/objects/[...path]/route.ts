import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/clients';

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
  console.log('API route handler:', { params, method: request.method });
  
  try {
    const storage = getStorage();
    const objectPath = params.path.join('/');
    
    // Get object info and metadata
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

    // For HEAD requests, return headers with checksums
    if (request.method === 'HEAD') {
      const headers: Record<string, string> = {
        'Content-Length': objectInfo.size?.toString() || '0',
        'Content-Type': objectInfo.metadata?.content_type || 'application/octet-stream'
      };

      // Add checksum headers if available
      if (objectInfo.metadata?.sha256) {
        headers['x-amz-checksum-sha256'] = objectInfo.metadata.sha256;
      }
      if (objectInfo.metadata?.sha1) {
        headers['x-amz-checksum-sha1'] = objectInfo.metadata.sha1;
      }

      console.log('Returning HEAD response with headers:', headers);
      
      return new Response(null, {
        status: 200,
        headers
      });
    }

    // For GET requests, return full object info
    return NextResponse.json({
      id: `${params.account_id}/${params.repository_id}/${objectPath}`,
      repository_id: params.repository_id,
      path: objectPath,
      size: objectInfo.size || 0,
      type: objectInfo.type || 'file',
      updated_at: objectInfo.updated_at || new Date().toISOString(),
      created_at: objectInfo.created_at || new Date().toISOString(),
      metadata: objectInfo.metadata
    });

  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      { error: 'Failed to get object metadata' },
      { status: 500 }
    );
  }
} 