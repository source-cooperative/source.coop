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

### New Schema (`Accounts_v2`)
```typescript
interface NewAccount {
  account_id: string;        // Partition Key
  type: string;             // Sort Key ('individual' | 'organization')
  name: string;
  email?: string;
  created_at: string;
  updated_at: string;
  disabled: boolean;
  flags: string[];
  metadata_public: {
    location?: string;
    bio?: string;
    orcid?: string;        // New field
    ror_id?: string;       // New field
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
   - Old: `account_type` as string
   - New: `type` as sort key with strict values

3. **Metadata Organization**:
   - Old: Single `profile` object
   - New: Split into `metadata_public` and `metadata_private`

4. **New Fields**:
   - `created_at` and `updated_at` timestamps
   - `orcid` for individual accounts
   - `ror_id` for organizations

5. **Indexes**:
   - Old: No GSIs
   - New: Two GSIs for common queries
     - GSI1: `type` + `account_id`
     - GSI2: `email` + `account_id`

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

### New Schema (`Repositories_v2`)
```typescript
interface NewRepository {
  repository_id: string;    // Partition Key
  account_id: string;       // Sort Key
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  visibility: 'public' | 'private';
  metadata: {
    mirrors: {
      [key: string]: {
        prefix: string;
        data_connection_id: string;
      }
    };
    primary_mirror: string;
    tags?: string[];
  };
}
```

### Key Changes
1. **Key Order**:
   - Old: `account_id` (PK) + `repository_id` (SK)
   - New: `repository_id` (PK) + `account_id` (SK)

2. **Simplified Structure**:
   - Old: Nested `data` and `meta` objects
   - New: Flattened structure with `metadata` object

3. **Visibility**:
   - Old: `data_mode` and `state` fields
   - New: Single `visibility` field

4. **Timestamps**:
   - Old: Single `published` field
   - New: `created_at` and `updated_at` fields

5. **Indexes**:
   - Old: No GSIs
   - New: GSI1 for listing repositories by account
     - GSI1: `account_id` + `created_at`

## Migration Rules

### Account Migration
```typescript
function migrateAccount(oldAccount: OldAccount): NewAccount {
  return {
    account_id: oldAccount.account_id,
    type: oldAccount.account_type === 'user' ? 'individual' : 'organization',
    name: oldAccount.profile?.name || oldAccount.account_id,
    email: oldAccount.profile?.email,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    disabled: oldAccount.disabled,
    flags: oldAccount.flags,
    metadata_public: {
      location: oldAccount.profile?.location,
      bio: oldAccount.profile?.bio
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
  return {
    repository_id: oldRepo.repository_id,
    account_id: oldRepo.account_id,
    title: oldRepo.meta?.title || oldRepo.repository_id,
    description: oldRepo.meta?.description,
    created_at: oldRepo.published || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    visibility: oldRepo.data_mode === 'open' ? 'public' : 'private',
    metadata: {
      mirrors: oldRepo.data?.mirrors,
      primary_mirror: oldRepo.data?.primary_mirror,
      tags: oldRepo.meta?.tags
    }
  };
}
```

## Validation Rules

1. **Required Fields**:
   - All accounts must have `account_id`, `type`, and `name`
   - All repositories must have `repository_id`, `account_id`, and `title`

2. **Data Types**:
   - All timestamps must be valid ISO 8601 strings
   - Boolean fields must be actual booleans
   - Arrays must be properly formatted

3. **Relationships**:
   - All repository `account_id`s must reference valid accounts
   - All account types must be either 'individual' or 'organization'

4. **Indexes**:
   - GSI1 and GSI2 must be properly populated for accounts
   - GSI1 must be properly populated for repositories 