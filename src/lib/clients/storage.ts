import { LocalStorageClient } from '../storage/local';
import { S3StorageClient } from '../storage/s3';
import { CONFIG } from '../config';
import type { StorageClient, StorageProvider, StorageConfig, StorageType, _ObjectPath, ListObjectsParams, GetObjectParams, PutObjectParams, DeleteObjectParams } from '@/types/storage';

export function createStorageClient(): StorageClient {
  console.log('Creating storage client with config:', CONFIG);

  if (!CONFIG.storage.endpoint || CONFIG.storage.endpoint.trim() === '') {
    console.error('Storage endpoint is missing in CONFIG:', CONFIG);
    throw new Error('Storage endpoint is not configured');
  }

  const storageType = CONFIG.storage.type.toLowerCase() as StorageType;

  const provider: StorageProvider = {
    provider_id: CONFIG.storage.type.toLowerCase(),
    type: storageType,
    endpoint: CONFIG.storage.endpoint,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const config: StorageConfig = {
    type: storageType,
    endpoint: CONFIG.storage.endpoint,
    region: CONFIG.storage.region,
    credentials: {
      access_key_id: process.env.AWS_ACCESS_KEY_ID || '',
      secret_access_key: process.env.AWS_SECRET_ACCESS_KEY || '',
    }
  };

  console.log('Creating storage client with:', { provider, config });
  
  // Create the appropriate storage client based on type
  if (storageType === 's3') {
    return new S3StorageClient(provider, config);
  } else {
    return new LocalStorageClient(provider, config);
  }
} 