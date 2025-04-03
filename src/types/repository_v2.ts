import type { Account } from './account_v2';

// Mirror configuration and status tracking
export interface RepositoryMirror {
  url: string;
  type: 'git' | 'http';
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
  last_sync_at?: string;
  error?: string;
}

// Role assignment for repository access
export interface RepositoryRole {
  account_id: string;
  role: 'admin' | 'write' | 'read';
  granted_at: string;
  granted_by: string;
}

// Main repository interface matching new schema
export interface Repository_v2 {
  repository_id: string;    // Partition Key
  account_id: string;       // Sort Key
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  visibility: 'public' | 'private';
  metadata: {
    mirrors: Record<string, RepositoryMirror>;
    primary_mirror: string;
    tags: string[];
    roles: Record<string, RepositoryRole>;
  };
  account?: Account;
  mirrors: RepositoryMirror[];
  roles: RepositoryRole[];
}

// Index interfaces for GSIs
export interface AccountRepositoriesIndex {
  account_id: string;      // PK
  created_at: string;      // SK
  repository_id: string;   // Projected attribute
  title: string;          // Projected attribute
  visibility: string;     // Projected attribute
}

export interface PublicRepositoriesIndex {
  visibility: string;     // PK
  created_at: string;    // SK
  repository_id: string; // Projected attribute
  account_id: string;    // Projected attribute
  title: string;        // Projected attribute
} 