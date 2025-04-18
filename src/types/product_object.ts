export type ProductObjectType = 
  | 'directory'
  | 'file'
  | string; // For MIME types or other custom types

export interface ProductObjectMetadata {
  sha256?: string;
  sha1?: string;
  [key: string]: string | number | boolean | null | undefined; // More specific types for metadata values
}

export interface ProductObject {
  id: string;
  product_id: string;
  path: string;
  size: number;
  type?: ProductObjectType;
  mime_type?: string; // Optional explicit MIME type for files
  created_at: string;
  updated_at: string;
  checksum: string;
  content?: Buffer | string; // Added for storage client responses
  metadata?: ProductObjectMetadata;
  name?: string; // Name of the file or directory
  isDirectory?: boolean; // Whether this is a directory
} 