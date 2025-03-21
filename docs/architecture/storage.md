# Storage Architecture

## Overview
This document describes the storage architecture of the Source.coop platform, including both database and file storage systems.

## Database Storage (DynamoDB)

### Data Model Overview
The platform uses DynamoDB for storing metadata about accounts and repositories. The actual contents of repositories (files, directories) are stored in the object store, not in DynamoDB.

### Tables

#### Accounts Table
- **Partition Key**: `account_id` (string)
- **Sort Key**: `type` (string)
- **Purpose**: Store user and organization profiles
- **Attributes**:
  - `account_id`: Unique identifier
  - `type`: Either 'user' or 'organization'
  - `name`: Display name
  - `email`: Contact email
  - `created_at`: ISO timestamp
  - `updated_at`: ISO timestamp
  - `metadata_public`: Public profile data
  - `metadata_private`: Private account data
- **Indexes**:
  - GSI1: `type` (partition key) + `account_id` (sort key)
  - GSI2: `email` (partition key) + `account_id` (sort key)

#### Repositories Table
- **Partition Key**: `repository_id` (string)
- **Sort Key**: `account_id` (string)
- **Purpose**: Store repository metadata and ownership
- **Attributes**:
  - `repository_id`: Unique identifier
  - `account_id`: Owner's account ID
  - `title`: Repository name
  - `description`: Repository description
  - `created_at`: ISO timestamp
  - `updated_at`: ISO timestamp
  - `visibility`: 'public' or 'private'
  - `metadata`: Additional repository metadata
- **Indexes**:
  - GSI1: `account_id` (partition key) + `created_at` (sort key)

### Data Access Patterns

#### Account Queries
```typescript
// Get account by ID
const account = await dynamodb.get({
  TableName: 'Accounts',
  Key: { account_id, type }
});

// List accounts by type
const accounts = await dynamodb.query({
  TableName: 'Accounts',
  IndexName: 'GSI1',
  KeyConditionExpression: '#type = :type',
  ExpressionAttributeNames: { '#type': 'type' },
  ExpressionAttributeValues: { ':type': 'organization' }
});
```

#### Repository Queries
```typescript
// Get repository by ID
const repository = await dynamodb.get({
  TableName: 'Repositories',
  Key: { repository_id, account_id }
});

// List repositories for account
const repositories = await dynamodb.query({
  TableName: 'Repositories',
  IndexName: 'GSI1',
  KeyConditionExpression: 'account_id = :account_id',
  ExpressionAttributeValues: { ':account_id': account_id }
});
```

## File Storage

### Overview
Repository contents (files, directories) are stored in the object store, not in DynamoDB. Each repository has its own prefix in the object store: `[account_id]/[repository_id]/`.

### Local Development Storage

#### Directory Structure
```
/storage
  /{account_id}
    /{repository_id}
      /{files}
      /.source-metadata.json
```

#### Metadata File
The `.source-metadata.json` file in each repository directory stores metadata about the files within that repository. This is separate from the repository metadata stored in DynamoDB.

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

### Storage Operations

#### File Operations
```typescript
interface StorageClient {
  // List objects in a directory
  listObjects(params: ListObjectsParams): Promise<ListObjectsResult>;
  
  // Get object metadata
  getObject(params: GetObjectParams): Promise<GetObjectResult>;
  
  // Upload file
  putObject(params: PutObjectParams): Promise<PutObjectResult>;
  
  // Delete object
  deleteObject(params: DeleteObjectParams): Promise<DeleteObjectResult>;
}
```

#### Metadata Operations
```typescript
interface MetadataClient {
  // Read repository metadata
  readMetadata(repository_id: string): Promise<SourceMetadata>;
  
  // Update repository metadata
  updateMetadata(repository_id: string, metadata: SourceMetadata): Promise<void>;
  
  // Update object metadata
  updateObjectMetadata(
    repository_id: string,
    path: string,
    metadata: Partial<RepositoryObject>
  ): Promise<void>;
}
```

### Performance Considerations

#### Large Directories
- Progressive loading (depth=1 first)
- Virtual lists for >20 items
- Cache structures and paths
- GPU acceleration for scrolling

#### File Operations
- Chunked uploads for large files
- Parallel uploads for multiple files
- Background metadata updates
- Efficient directory traversal

#### Caching Strategy
- Cache directory structures
- Cache file metadata
- Cache frequently accessed files
- Invalidate cache on updates

## Future Storage Providers

### Cloud Storage Integration
- S3-compatible storage
- Azure Blob Storage
- Google Cloud Storage
- Custom storage providers

### Storage Features
- Data replication
- Backup and restore
- Version control
- Access control

### Migration Strategy
- Storage provider abstraction
- Data migration tools
- Metadata synchronization
- Backup verification

## Security Considerations

### Access Control
- Repository-level permissions
- File-level permissions
- Role-based access
- API key management

### Data Protection
- Encryption at rest
- Encryption in transit
- Secure file deletion
- Audit logging

### Compliance
- Data retention policies
- Access logging
- Security monitoring
- Compliance reporting 