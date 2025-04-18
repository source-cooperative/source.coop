# Data Model

## Overview
This document describes the core data models used in the Source.coop platform.

## Accounts

### Base Account
```typescript
interface BaseAccount {
  account_id: string;
  name: string;
  type: 'individual' | 'organization';
  description?: string;
  created_at: string;
  updated_at: string;
}
```

### Individual Account
```typescript
interface IndividualAccount extends BaseAccount {
  type: 'individual';
  email: string;
  orcid?: string;
}
```

### Organizational Account
```typescript
interface OrganizationalAccount extends BaseAccount {
  type: 'organization';
  owner_account_id: string;
  admin_account_ids: string[];
  member_account_ids?: string[];
  ror_id?: string;
}
```

## Data Products

### Product Mirror
```typescript
interface ProductMirror {
  storage_type: 's3' | 'azure' | 'gcs' | 'minio' | 'ceph';
  connection_id: string;     // Reference to storage connection config
  prefix: string;           // Format: "{account_id}/{product_id}/"
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
  
  // Monitoring
  stats: {
    total_objects: number;
    total_size: number;
    last_verified_at: string;
  };
}
```

### Product Role
```typescript
interface ProductRole {
  account_id: string;
  role: 'admin' | 'contributor' | 'viewer';
  granted_at: string;
  granted_by: string;      // account_id of who granted the role
}
```

### Product
```typescript
interface Product_v2 {
  product_id: string;    // Partition Key
  account_id: string;    // Sort Key
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  visibility: 'public' | 'unlisted' | 'restricted';
  metadata: {
    mirrors: Record<string, ProductMirror>;
    primary_mirror: string;      // Key of the primary mirror (e.g., "aws-us-east-1")
    tags?: string[];
    roles: Record<string, ProductRole>;
  };
  account?: Account;
}
```

## Storage Objects

### Product Object
```typescript
interface ProductObject {
  id: string;
  product_id: string;
  path: string;
  size: number;
  type: 'file' | 'directory';
  mime_type: string;
  created_at: string;
  updated_at: string;
  checksum: string;
  metadata: Record<string, unknown>;
}
```

## Relationships

### Account-Product
- One-to-many relationship
- Account owns products
- Products belong to one account
- Account can be either individual or organization

### Product-Object
- One-to-many relationship
- Product contains objects
- Objects belong to one product
- Objects can be files or directories

### Organization-Member
- Many-to-many relationship
- Organization has multiple members
- Members can belong to multiple organizations
- Different member roles (owner, admin, member)

## Database Schema

### DynamoDB Tables

#### Accounts Table
```typescript
interface AccountsTable {
  account_id: string;  // Partition Key
  type: string;        // Sort Key
  name: string;
  description?: string;
  email?: string;
  orcid?: string;
  owner_account_id?: string;
  admin_account_ids?: string[];
  member_account_ids?: string[];
  ror_id?: string;
  created_at: string;
  updated_at: string;
}
```

#### Products Table
```typescript
interface ProductsTable {
  product_id: string;  // Partition Key
  account_id: string;  // Sort Key
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  visibility: string;
  metadata: {
    mirrors: Record<string, ProductMirror>;
    primary_mirror: string;
    tags?: string[];
    roles: Record<string, ProductRole>;
  };
}
```

#### Account Products Index
```typescript
interface AccountProductsIndex {
  account_id: string;      // PK
  created_at: string;      // SK
  product_id: string;      // Projected attribute
  title: string;           // Projected attribute
  visibility: string;      // Projected attribute
}
```

#### Public Products Index
```typescript
interface PublicProductsIndex {
  visibility: string;      // PK
  created_at: string;      // SK
  product_id: string;      // Projected attribute
  account_id: string;      // Projected attribute
  title: string;           // Projected attribute
}
```

## File Storage Structure

### Directory Layout
```
/storage
  /{account_id}
    /{product_id}
      /{files}
      /.source-metadata.json
```

### Metadata File
```typescript
interface SourceMetadata {
  product_id: string;
  account_id: string;
  objects: {
    [path: string]: {
      id: string;
      type: 'file' | 'directory';
      size: number;
      mime_type: string;
      created_at: string;
      updated_at: string;
      checksum: string;
      metadata: Record<string, unknown>;
    }
  };
  last_updated: string;
}
```

## Type Safety

### Type Guards
```typescript
function isIndividualAccount(account: BaseAccount): account is IndividualAccount {
  return account.type === 'individual';
}

function isOrganizationalAccount(account: BaseAccount): account is OrganizationalAccount {
  return account.type === 'organization';
}
```

### Const Assertions
```typescript
const accountType = 'organization' as const;
const account = {
  ...baseAccount,
  type: accountType,
  owner_account_id: string,
  admin_account_ids: string[]
};
```

## Data Validation

### Required Fields
- All IDs must be non-empty strings
- Timestamps must be valid ISO 8601 strings
- File sizes must be non-negative numbers
- Checksums must be valid SHA-256 hashes

### Optional Fields
- Descriptions can be empty strings
- Metadata can be empty objects
- Member lists can be empty arrays

## Data Operations

### Create Operations
- Generate unique IDs
- Set creation timestamps
- Initialize empty arrays/objects
- Validate required fields

### Update Operations
- Update timestamps
- Validate field types
- Maintain referential integrity
- Handle optional fields

### Delete Operations
- Cascade deletes where appropriate
- Clean up file storage
- Remove metadata entries
- Update relationships 