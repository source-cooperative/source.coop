// Mirror configuration interface
export interface RepositoryMirror {
  storage_type: 's3' | 'azure' | 'gcs' | 'minio' | 'ceph';
  connection_id: string;
  prefix: string;
  config: {
    region?: string;
    bucket?: string;
    container?: string;
    endpoint?: string;
  };
  is_primary: boolean;
  sync_status: {
    last_sync_at: string;
    is_synced: boolean;
    error?: string;
  };
  stats: {
    total_objects: number;
    total_size: number;
    last_verified_at: string;
  };
}

// Role configuration interface
export interface RepositoryRole {
  role: 'admin' | 'contributor' | 'viewer';
  granted_at: string;
  granted_by: string;
}

// Repository interface
export interface Repository {
  repository_id: string;
  account_id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  visibility: 'public' | 'unlisted' | 'restricted';
  metadata: {
    mirrors: {
      [key: string]: RepositoryMirror;  // key format: "{provider}-{region}" e.g., "aws-us-east-1"
    };
    primary_mirror: string;  // Key of the primary mirror
    tags?: string[];
    roles: {
      [account_id: string]: RepositoryRole;
    };
  };
} 