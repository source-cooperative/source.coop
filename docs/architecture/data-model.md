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
  logo_svg?: string;
}
```

## Repositories

### Repository
```typescript
interface Repository {
  repository_id: string;
  account_id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}
```

## Storage Objects

### Repository Object
```typescript
interface RepositoryObject {
  id: string;
  repository_id: string;
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

### Account-Repository
- One-to-many relationship
- Account owns repositories
- Repositories belong to one account
- Account can be either individual or organization

### Repository-Object
- One-to-many relationship
- Repository contains objects
- Objects belong to one repository
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
  logo_svg?: string;
  created_at: string;
  updated_at: string;
}
```

#### Repositories Table
```typescript
interface RepositoriesTable {
  repository_id: string;  // Partition Key
  account_id: string;     // Sort Key
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}
```

## File Storage Structure

### Directory Layout
```
/storage
  /{account_id}
    /{repository_id}
      /{files}
      /.source-metadata.json
```

### Metadata File
```typescript
interface SourceMetadata {
  repository_id: string;
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