import type { Account } from "@/types";

// Mirror configuration and status tracking
export interface ProductMirror {
  storage_type: "s3" | "azure" | "gcs" | "minio" | "ceph";
  connection_id: string; // Reference to storage connection config
  prefix: string; // Format: "{account_id}/{product_id}/"
  config: {
    region?: string; // For S3/GCS
    bucket?: string; // For S3/GCS
    container?: string; // For Azure
    endpoint?: string; // For MinIO/Ceph
  };

  // Mirror-specific settings
  is_primary: boolean; // Is this the primary mirror?
  sync_status: {
    last_sync_at: string;
    is_synced: boolean;
    error?: string;
  };

  // Monitoring
  stats: {
    total_objects: number;
    total_size: number;
    last_verified_at: string;
  };
}

// Role assignment for product access
export interface ProductRole {
  account_id: string;
  role: "admin" | "contributor" | "viewer";
  granted_at: string;
  granted_by: string; // account_id of who granted the role
}

// Main product interface matching new schema
export interface Product_v2 {
  product_id: string; // Partition Key
  account_id: string; // Sort Key
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  visibility: "public" | "unlisted" | "restricted";
  metadata: {
    mirrors: Record<string, ProductMirror>;
    primary_mirror: string; // Key of the primary mirror (e.g., "aws-us-east-1")
    tags?: string[];
    roles: Record<string, ProductRole>;
  };
  account?: Account;
}

// Index interfaces for GSIs
export interface AccountProductsIndex {
  account_id: string; // PK
  created_at: string; // SK
  product_id: string; // Projected attribute
  title: string; // Projected attribute
  visibility: string; // Projected attribute
}

export interface PublicProductsIndex {
  visibility: string; // PK
  created_at: string; // SK
  product_id: string; // Projected attribute
  account_id: string; // Projected attribute
  title: string; // Projected attribute
}
