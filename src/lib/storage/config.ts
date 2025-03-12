import { LocalStorageClient } from './local';
import { S3StorageClient } from './s3';
import { StorageConfig, StorageProvider, StorageType } from '@/types/storage';

if (!process.env.STORAGE_TYPE) {
  throw new Error('STORAGE_TYPE environment variable is not set');
}

if (!process.env.STORAGE_ENDPOINT) {
  throw new Error('STORAGE_ENDPOINT environment variable is not set');
}

export function getStorageClient() {
  const storageType = process.env.STORAGE_TYPE as StorageType;
  if (!storageType) {
    throw new Error('STORAGE_TYPE environment variable is not set');
  }

  const provider: StorageProvider = {
    provider_id: storageType.toLowerCase(),
    type: storageType,
    endpoint: process.env.STORAGE_ENDPOINT,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const config: StorageConfig = {
    type: storageType,
    endpoint: process.env.STORAGE_ENDPOINT,
    region: process.env.AWS_REGION,
    // Add other config options as needed
  };

  switch (process.env.STORAGE_TYPE) {
    case 'LOCAL':
      return new LocalStorageClient(provider, config);
    case 'S3':
      return new S3StorageClient(provider, config);
    default:
      throw new Error(`Unsupported storage type: ${process.env.STORAGE_TYPE}`);
  }
} 