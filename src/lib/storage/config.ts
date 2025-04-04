import { LocalStorageClient } from './local';
import type { StorageClient, StorageProvider, StorageConfig, StorageType } from '@/types/storage';
import { CONFIG } from "../config";

export function getStorageClient(): StorageClient {
  const storageType = CONFIG.storage.type as StorageType;
  const endpoint = CONFIG.storage.endpoint;

  if (!endpoint) {
    throw new Error("Storage endpoint is required");
  }

  const config: StorageConfig = {
    type: storageType,
    endpoint,
    region: CONFIG.storage.region,
    credentials: CONFIG.storage.credentials,
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