import { LocalStorageClient } from '../storage/local';
import { CONFIG } from '../config';
import type { StorageClient, StorageProvider, StorageConfig, StorageType } from '@/types/storage';

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
  };

  console.log('Creating LocalStorageClient with:', { provider, config });
  return new LocalStorageClient(provider, config);
} 