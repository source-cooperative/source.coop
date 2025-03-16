import { LocalStorageClient } from './local';
import type { StorageClient, StorageProvider, StorageConfig, StorageType } from '@/types/storage';

export function getStorageClient(): StorageClient {
  const storageType = (process.env.STORAGE_TYPE || 'LOCAL') as StorageType;
  const endpoint = process.env.STORAGE_ENDPOINT;

  if (!endpoint) {
    throw new Error('Storage endpoint is required');
  }

  const config: StorageConfig = {
    type: storageType,
    endpoint,
    region: process.env.AWS_REGION,
    credentials: {
      access_key_id: process.env.AWS_ACCESS_KEY_ID || '',
      secret_access_key: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  };

  // For now, we only support local storage
  const provider: StorageProvider = {
    provider_id: 'local',
    type: storageType,
    endpoint,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return new LocalStorageClient(provider, config);
} 