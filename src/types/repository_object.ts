export type RepositoryObjectType = 
  | 'directory'
  | 'file'
  | string; // For MIME types or other custom types

export interface RepositoryObjectMetadata {
  sha256?: string;
  sha1?: string;
  [key: string]: any; // Allow for other metadata fields
}

export interface RepositoryObject {
  id: string;
  repository_id: string;
  path: string;
  size: number;
  type?: RepositoryObjectType;
  mime_type?: string; // Optional explicit MIME type for files
  created_at: string;
  updated_at: string;
  checksum: string;
  content?: Buffer | string; // Added for storage client responses
  metadata?: RepositoryObjectMetadata;
} 