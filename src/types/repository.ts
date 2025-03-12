export interface Repository {
  // Essential fields only
  repository_id: string;
  account_id: string;
  title: string;
  description: string;
  private: boolean;
  created_at: string;
  updated_at: string;

  // Optional fields
  metadata_files?: {
    [key: string]: string[] | undefined;  // Generic metadata files support
  };

  // Optional directory-related metadata
  default_branch?: string;  // For repos that have a main/master concept
  root_metadata?: {
    readme?: string;  // Path to root README if exists
    license?: string; // Path to LICENSE file if exists
    // ... other special files
  };
}

export interface RepositoryStatistics {
  repository_id: string;
  
  // Object counts
  total_objects: number;
  total_bytes: number;
  
  // Time tracking
  first_object_at: string;  // ISO timestamp of oldest object
  last_object_at: string;   // ISO timestamp of newest object
  
  // Optional breakdown by file type
  file_types?: {
    [extension: string]: {
      count: number;
      bytes: number;
    };
  };

  // Directory statistics
  directory_count?: number;  // Number of unique directories
  max_depth?: number;       // Maximum directory depth
  top_directories?: {      // Most populated directories
    [path: string]: {
      object_count: number;
      total_bytes: number;
    };
  };
}