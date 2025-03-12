import { NextResponse } from 'next/server';
import { getStorageClient } from '@/lib/storage/config';

export async function GET(
  request: Request,
  { params }: { params: { account_id: string; repository_id: string; } }
) {
  try {
    const storage = getStorageClient();
    
    const objects = await storage.listObjects({
      account_id: params.account_id,
      repository_id: params.repository_id,
    });

    return NextResponse.json(objects);
  } catch (error) {
    console.error('Error listing objects:', error);
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'Failed to list objects' },
      { status: 500 }
    );
  }
} 