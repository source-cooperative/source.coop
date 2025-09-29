# Schema Changes

This document details the changes between the old and new DynamoDB schemas.

## Accounts Table

### Old Schema (`sc-accounts`)
```typescript
interface OldAccount {
  account_id: string;        // Partition Key
  identity_id: string;
  account_type: 'user' | 'organization';
  disabled: boolean;
  flags: string[];
  profile: {
    name?: string;
    email?: string;
    location?: string;
    bio?: string;
  };
}
```

### New Schema (Production table will remain as `sc-accounts`)
```typescript
interface NewAccount {
  account_id: string;        // Partition Key
  type: 'individual' | 'organization';  // Sort Key - strictly typed
  name: string;
  emails: {                  // Structured email data
    address: string;
    verified: boolean;
    verified_at?: string;
    is_primary: boolean;     // One must be true
    added_at: string;
  }[];
  created_at: string;
  updated_at: string;
  disabled: boolean;
  flags: string[];
  metadata_public: {
    location?: string;
    bio?: string;
    orcid?: string;        // New field for individual accounts
    ror_id?: string;       // New field for organization accounts
    domains?: {            // New field
      domain: string;
      status: 'unverified' | 'pending' | 'verified';
      verification_method?: 'dns' | 'html' | 'file';
      verification_token?: string;
      verified_at?: string;
      created_at: string;
      expires_at?: string;
    }[];
  };
  metadata_private: {
    identity_id: string;
  };
}
```

### Key Changes
1. **Composite Key**:
   - Old: Single partition key (`account_id`)
   - New: Composite key (`account_id` + `type`)

2. **Type Safety**:
   - Old: `account_type` as 'user' | 'organization'
   - New: `type` as sort key with strict values 'individual' | 'organization'
   - More precise terminology ('individual' instead of 'user')
   - Type as sort key enforces data integrity at database level

3. **Email Management**:
   - Old: Single optional email in profile
   - New: Structured array of emails with:
     - Primary email designation
     - Verification status tracking
     - Timestamps for auditing
     - Support for multiple emails per account
   - Each email entry includes:
     - Address validation
     - Verification status
     - Primary flag (one must be true)
     - Addition timestamp

4. **Metadata Organization**:
   - Old: Single `profile` object
   - New: Split into `metadata_public` and `metadata_private`

5. **New Fields**:
   - `created_at` and `updated_at` timestamps
   - `orcid` for individual accounts
   - `ror_id` for organizations
   - `domains` for managing domain ownership and verification status

6. **Indexes**:
   - Old: No GSIs
   - New: GSIs for common queries
     - `AccountTypeIndex`: `type` + `account_id` (for filtering accounts by type)
     - `AccountEmailIndex`: `emails[].address` + `account_id` (for email lookups)

## Repositories Table

### Old Schema (`sc-repositories`)
```typescript
interface OldRepository {
  account_id: string;       // Partition Key
  repository_id: string;    // Sort Key
  published: string;
  data: {
    mirrors: {
      [key: string]: {
        prefix: string;
        data_connection_id: string;
      }
    };
    primary_mirror: string;
  };
  meta: {
    title: string;
    description?: string;
    tags?: string[];
  };
  disabled: boolean;
  data_mode: 'open' | 'private';
  featured: number;
  state: 'listed' | 'unlisted';
}
```

### New Schema (Production table will remain as `sc-repositories`)
```typescript
interface NewRepository {
  repository_id: string;    // Partition Key
  account_id: string;       // Sort Key
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  visibility: 'public' | 'unlisted' | 'restricted';
  metadata: {
    mirrors: {
      [key: string]: {      // key format: "{provider}-{region}" e.g., "aws-us-east-1"
        storage_type: 's3' | 'azure' | 'gcs' | 'minio' | 'ceph';
        connection_id: string;     // Reference to storage connection config
        prefix: string;           // Format: "{account_id}/{repository_id}/"
        config: {
          region?: string;        // For S3/GCS
          bucket?: string;        // For S3/GCS
          container?: string;     // For Azure
          endpoint?: string;      // For MinIO/Ceph
        };
        
        // Mirror-specific settings
        is_primary: boolean;      // Is this the primary mirror?
        sync_status: {
          last_sync_at: string;
          is_synced: boolean;
          error?: string;
        };
      }
    };
    primary_mirror: string;      // Key of the primary mirror (e.g., "aws-us-east-1")
    tags?: string[];
    roles: {
      [account_id: string]: {
        role: 'admin' | 'contributor' | 'viewer';
        granted_at: string;
        granted_by: string;      // account_id of who granted the role
      }
    };
  };
}
```

### Key Changes
1. **Key Order**:
   - Old: `account_id` (PK) + `repository_id` (SK)
   - New: `repository_id` (PK) + `account_id` (SK)

2. **Visibility Control**:
   - Old: Simple `data_mode` and `state` fields
   - New: Single `visibility` field with three states:
     - `public`: Visible to everyone, listed in search/sitemap
     - `unlisted`: Visible via direct URL to authenticated contributors
     - `restricted`: Only visible to explicitly granted users

3. **Access Control**:
   - Added `roles` object to track permissions
   - Three role levels:
     - `admin`: Full control over repository settings and access
     - `contributor`: Can modify repository contents
     - `viewer`: Can view repository contents

4. **Mirror Structure**:
   - Deterministic mirror keys based on provider and region
   - Standardized prefix format: "{account_id}/{repository_id}/"
   - Support for multiple storage backends
   - Clear primary mirror designation
   - Added sync status tracking
   - Added mirror verification

5. **Indexes**:
   - Old: No GSIs
   - New: GSIs for common queries
     - `AccountRepositoriesIndex`: `account_id` + `created_at` (for listing repositories by account)
     - `PublicRepositoriesIndex`: `visibility` + `created_at` (for public repository discovery)

## Migration Rules

### Account Migration
```typescript
function migrateAccount(oldAccount: OldAccount): NewAccount {
  const now = new Date().toISOString();
  return {
    account_id: oldAccount.account_id,
    type: oldAccount.account_type === 'user' ? 'individual' : 'organization',
    name: oldAccount.profile?.name || oldAccount.account_id,
    emails: oldAccount.profile?.email ? [{
      address: oldAccount.profile.email,
      verified: false,  // Will need to be verified in new system
      is_primary: true,
      added_at: now
    }] : [],
    created_at: now,
    updated_at: now,
    disabled: oldAccount.disabled,
    flags: oldAccount.flags,
    metadata_public: {
      location: oldAccount.profile?.location,
      bio: oldAccount.profile?.bio,
      domains: []  // Initialize empty array
    },
    metadata_private: {
      identity_id: oldAccount.identity_id
    }
  };
}
```

### Repository Migration
```typescript
function migrateRepository(oldRepo: OldRepository): NewRepository {
  const now = new Date().toISOString();
  return {
    repository_id: oldRepo.repository_id,
    account_id: oldRepo.account_id,
    title: oldRepo.meta?.title || oldRepo.repository_id,
    description: oldRepo.meta?.description,
    created_at: oldRepo.published || now,
    updated_at: now,
    visibility: oldRepo.data_mode === 'open' 
      ? (oldRepo.state === 'listed' ? 'public' : 'unlisted')
      : 'restricted',
    metadata: {
      mirrors: Object.entries(oldRepo.data?.mirrors || {}).reduce((acc, [key, mirror]) => ({
        ...acc,
        [key]: {
          storage_type: 's3',  // Default to S3 for existing mirrors
          connection_id: mirror.data_connection_id,
          prefix: `${oldRepo.account_id}/${oldRepo.repository_id}/`,
          config: {
            region: 'us-east-1',  // Default region
            bucket: 'source-coop-data'  // Default bucket
          },
          is_primary: key === oldRepo.data?.primary_mirror,
          sync_status: {
            last_sync_at: now,
            is_synced: true
          }
        }
      }), {}),
      primary_mirror: oldRepo.data?.primary_mirror,
      tags: oldRepo.meta?.tags,
      roles: {
        [oldRepo.account_id]: {
          role: 'admin',
          granted_at: now,
          granted_by: oldRepo.account_id
        }
      }
    }
  };
}
```

## Validation Rules

1. **Required Fields**:
   - All accounts must have `account_id`, `type`, and `name`
   - All repositories must have `repository_id`, `account_id`, and `title`

2. **Visibility Rules**:
   - Public repositories must be accessible to all users
   - Unlisted repositories must have at least one contributor
   - Restricted repositories must have at least one viewer
   - Only admins can change visibility

3. **Role Rules**:
   - Every repository must have at least one admin
   - Admins can only be granted by other admins
   - Organization accounts can be admins
   - Individual accounts can be admins, contributors, or viewers

4. **Mirror Rules**:
   - Each repository must have at least one mirror
   - One mirror must be designated as primary
   - Mirror keys must follow format: "{provider}-{region}"
   - Mirror prefixes must follow format: "{account_id}/{repository_id}/"
   - Connection IDs must reference valid storage connections
   - Storage type must be one of: 's3', 'azure', 'gcs', 'minio', 'ceph'
   - Each mirror must have sync status tracking
   - Each mirror must have verification stats

5. **Data Types**:
   - All timestamps must be valid ISO 8601 strings
   - Boolean fields must be actual booleans
   - Arrays must be properly formatted
   - Role types must be one of: 'admin', 'contributor', 'viewer'
   - Visibility must be one of: 'public', 'unlisted', 'restricted'
   - Storage types must be one of: 's3', 'azure', 'gcs', 'minio', 'ceph'