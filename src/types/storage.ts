import { ProductObject } from './product_object';

// Configuration for connecting to the provider
export interface StorageConfig {
  endpoint: string;
  region?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  options?: Record<string, unknown>;
}

// Path construction types and utilities
export interface ObjectPath {
  account_id: string;     // Matches Account interface
  product_id: string;  // Matches Product interface
  object_path: string;    // The actual path within the product
}

export interface ListObjectsParams extends ObjectPath {
  prefix?: string;
  delimiter?: string;
  maxKeys?: number;
  continuationToken?: string;
}

export interface ListObjectsResult {
  objects: ProductObject[];
  commonPrefixes: string[];
  nextContinuationToken?: string;
  isTruncated: boolean;
}

export interface GetObjectParams extends ObjectPath {
  versionId?: string;
}

export interface GetObjectResult {
  object: ProductObject;
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
  getObjectInfo(params: GetObjectParams): Promise<ProductObject>;
}