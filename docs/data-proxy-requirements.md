# Data Proxy Service Requirements

## 1. Core Purpose
Create a unified interface for sharing scientific data across multiple cloud storage providers, enabling:
- Seamless access to data regardless of storage location
- Consistent metadata and access patterns
- Usage tracking and analytics
- Access control based on repository permissions

## 2. Storage Integration
Leverage `obstore` for:
- High-performance storage operations
- Streaming uploads/downloads
- Automatic multipart uploads
- Provider abstraction (S3, GCS, Azure)

## 3. API Layer
Use `s3s` to provide:
- S3-compatible API endpoints
- Standard object operations
- Presigned URL generation
- Request/response handling

## 4. Data Model
Support our existing structures:
```typescript
interface RepositoryObject {
  id: string;
  repository_id: string;
  path: string;
  size: number;
  type: 'directory' | 'file';
  mime_type?: string;
  created_at: string;
  updated_at: string;
  checksum: string;
  metadata?: RepositoryObjectMetadata;
}
```

## 5. Key Features
- Streaming support for large files
- Automatic multipart uploads
- Metadata preservation
- Usage tracking
- Access control
- Performance optimization

## 6. Security
- Repository-level access control
- Temporary access tokens
- Rate limiting
- Request validation

## 7. Monitoring
- Operation tracking
- Usage statistics
- Performance metrics
- Error logging

## 8. Development
- Local storage support
- Provider-specific testing
- Performance benchmarking
- Clear error messages 