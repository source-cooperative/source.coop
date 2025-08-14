import { LocalStorageClient } from '../storage/local';
import { S3StorageClient } from '../storage/s3';
import { CONFIG } from '../config';
import type { StorageClient, StorageConfig, StorageType } from '@/types/storage';

export function createStorageClient(): StorageClient {
  console.log('Creating storage client with config:', CONFIG);

  if (!CONFIG.storage.endpoint || CONFIG.storage.endpoint.trim() === '') {
    console.error('Storage endpoint is missing in CONFIG:', CONFIG);
    throw new Error('Storage endpoint is not configured');
  }

  const storageType = CONFIG.storage.type.toUpperCase() as StorageType;

  const config: StorageConfig = {
    type: storageType,
    endpoint: CONFIG.storage.endpoint,
    region: CONFIG.storage.region,
    credentials: CONFIG.storage.credentials,
  };

  console.log("Creating storage client with:", config);

  // Create the appropriate storage client based on type
  if (storageType === "S3") {
    return new S3StorageClient(config);
  } else {
    return new LocalStorageClient(config);
  }
} 