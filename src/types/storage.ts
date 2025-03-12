export type StorageType = 'LOCAL' | 'S3';

// The storage provider entity
export interface StorageProvider {
  provider_id: string;
  type: StorageType;
  endpoint: string;
  bucket?: string;
  created_at: string;
  updated_at: string;
  credentials_id?: string;
}

// Configuration for connecting to the provider
export interface StorageConfig {
  type: StorageType;
  endpoint: string;
  bucket?: string;
  region?: string;  // Required for S3
  credentials?: {
    access_key_id: string;
    secret_access_key: string;
  };
  options?: {
    force_path_style?: boolean;
    ssl_enabled?: boolean;
    custom_endpoint?: string;
  };
}

// Path construction types and utilities
export interface ObjectPath {
  account_id: string;     // Matches Account interface
  repository_id: string;  // Matches Repository interface
  object_path: string;    // The actual path within the repository
}

export interface StorageLocation {
  provider_id: string;    // References StorageProvider
  full_path: string;     // Complete path including account/repo/object structure
}

// Helper function to construct the full object path
export function buildObjectPath(path: ObjectPath): string {
  return `${path.account_id}/${path.repository_id}/objects/${path.object_path}`;
}

// Helper to construct complete storage location
export function buildStorageLocation(
  provider: StorageProvider, 
  path: ObjectPath
): StorageLocation {
  return {
    provider_id: provider.provider_id,
    full_path: buildObjectPath(path)
  };
}

export interface StorageClient {
  listObjects(params: {
    account_id: string;
    repository_id: string;
  }): Promise<Array<{
    path: string;
    size: number;
    updated_at: string;
  }>>;

  getObjectInfo(params: {
    account_id: string;
    repository_id: string;
    object_path: string;
  }): Promise<{
    id?: string;
    size: number;
    created_at?: string;
    updated_at?: string;
    checksum?: string;
  }>;
} 