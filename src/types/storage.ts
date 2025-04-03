import { RepositoryObject } from './repository_object';
export type StorageType = 'LOCAL' | 'S3' | 'GCS' | 'AZURE';

// The storage provider entity
export interface StorageProvider {
  provider_id: string;
  type: StorageType;
  endpoint: string;
  created_at: string;
  updated_at: string;
}

// Configuration for connecting to the provider
export interface StorageConfig {
  type: StorageType;
  endpoint: string;
  region?: string;
  credentials?: {
    access_key_id: string;
    secret_access_key: string;
  };
  options?: Record<string, unknown>;
}

// Path construction types and utilities
export interface ObjectPath {
  account_id: string;     // Matches Account interface
  repository_id: string;  // Matches Repository interface
  object_path: string;    // The actual path within the repository
}

export interface StorageLocation {
  provider: StorageProvider;
  path: string;
}

export interface ListObjectsParams extends ObjectPath {
  prefix?: string;
  delimiter?: string;
  maxKeys?: number;
  continuationToken?: string;
}

export interface ListObjectsResult {
  objects: RepositoryObject[];
  commonPrefixes: string[];
  nextContinuationToken?: string;
  isTruncated: boolean;
}

export interface GetObjectParams extends ObjectPath {
  versionId?: string;
}

export interface GetObjectResult {
  object: RepositoryObject;
  data: Buffer | ReadableStream;
  contentType: string;
  contentLength: number;
  etag: string;
  lastModified: Date;
}

export interface PutObjectParams extends ObjectPath {
  data: Buffer | ReadableStream;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface PutObjectResult {
  etag: string;
  versionId?: string;
}

export interface DeleteObjectParams extends ObjectPath {
  versionId?: string;
}

export interface StorageClient {
  listObjects(params: ListObjectsParams): Promise<ListObjectsResult>;
  getObject(params: GetObjectParams): Promise<GetObjectResult>;
  putObject(params: PutObjectParams): Promise<PutObjectResult>;
  deleteObject(params: DeleteObjectParams): Promise<void>;
  getObjectInfo(params: GetObjectParams): Promise<RepositoryObject>;
}