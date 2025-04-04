import { NextResponse } from 'next/server';
import { getStorageClient } from '@/lib/storage/config';
import { CONFIG } from '@/lib/config';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ account_id: string; repository_id: string; }> }
) {
  const { account_id, repository_id } = await params;
  try {
    const storage = getStorageClient();
    
    const objects = await storage.listObjects({
      account_id,
      repository_id,
      object_path: '',
    });

    return NextResponse.json(objects);
  } catch (error) {
    console.error('Error listing objects:', error);
    return NextResponse.json(
      { error: CONFIG.environment.isDevelopment
          ? (error as Error).message 
          : 'Failed to list objects' },
      { status: 500 }
    );
  }
} 