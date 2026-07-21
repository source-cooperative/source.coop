import { ProductObject } from "./product";

// Configuration for connecting to the provider
export interface StorageConfig {
  endpoint: string;
  region?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

// Path construction types and utilities
export interface ObjectPath {
  account_id: string; // Matches Account interface
  product_id: string; // Matches Product interface
  object_path: string; // The actual path within the product
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

export interface HeadObjectParams extends ObjectPath {
  versionId?: string;
}

export interface HeadObjectResult {
  etag?: string;
  contentLength?: number;
  contentType?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
  versionId?: string;
}
