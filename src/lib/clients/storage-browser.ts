import { S3StorageClient } from '../storage/s3';
import { CONFIG } from '../config';
import type { StorageClient, StorageConfig, StorageType } from '@/types/storage';

export function createStorageClient(): StorageClient {
  const storageType = CONFIG.storage.type.toUpperCase() as StorageType;

  if (storageType !== 'S3') {
    throw new Error('Local storage client is not supported in the browser');
  }

  const config: StorageConfig = {
    type: storageType,
    endpoint: CONFIG.storage.endpoint,
    region: CONFIG.storage.region,
    credentials: CONFIG.storage.credentials,
  };

  return new S3StorageClient(config);
}
