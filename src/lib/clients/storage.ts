import { LocalStorageClient } from '../storage/local';
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
  };

  console.log('Creating LocalStorageClient with:', { provider, config });
  
  // Create the LocalStorageClient
  const localClient = new LocalStorageClient(provider, config);
  
  // Return an adapter that implements the full StorageClient interface
  return {
    // Implement the listObjects method
    listObjects: async (params: ListObjectsParams) => {
      return localClient.listObjects(params);
    },
    
    // Implement the getObjectInfo method
    getObjectInfo: async (params: GetObjectParams) => {
      return localClient.getObjectInfo(params);
    },
    
    // Implement the getObject method with the expected signature
    getObject: async (params: GetObjectParams) => {
      // Call the LocalStorageClient's getObject method
      const result = await localClient.getObject(params);
      
      // Return in the format expected by StorageClient interface
      return {
        object: result.object,
        data: result.data,
        contentType: result.contentType,
        contentLength: result.contentLength,
        etag: result.etag,
        lastModified: result.lastModified
      };
    },

    // Implement the putObject method
    putObject: async (params: PutObjectParams) => {
      return localClient.putObject(params);
    },

    // Implement the deleteObject method
    deleteObject: async (params: DeleteObjectParams) => {
      return localClient.deleteObject(params);
    }
  };
} 