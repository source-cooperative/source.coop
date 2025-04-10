export interface RepositoryStatistics {
  repository_id: string;

  // Object counts
  total_objects: number;
  total_bytes: number;

  // Time tracking
  first_object_at: string; // ISO timestamp of oldest object
  last_object_at: string; // ISO timestamp of newest object

  // Optional breakdown by file type
  file_types?: {
    [extension: string]: {
      count: number;
      bytes: number;
    };
  };

  // Directory statistics
  directory_count?: number; // Number of unique directories
  max_depth?: number; // Maximum directory depth
  top_directories?: {
    // Most populated directories
    [path: string]: {
      object_count: number;
      total_bytes: number;
    };
  };
}
