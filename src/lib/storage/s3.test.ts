import { S3StorageClient } from './s3';
import type { StorageProvider, StorageConfig, ListObjectsParams } from '@/types/storage';
import { describe, it, expect } from '@jest/globals';

describe('S3StorageClient', () => {
  const provider: StorageProvider = {
    provider_id: 's3',
    type: 'S3',
    endpoint: 'opendata.source.coop',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const config: StorageConfig = {
    type: 'S3',
    endpoint: 'opendata.source.coop',
    region: 'us-west-2',
  };

  const client = new S3StorageClient(provider, config);

  it('should list objects from public bucket', async () => {
    const params: ListObjectsParams = {
      account_id: 'fiboa',
      repository_id: 'de-mv',
      prefix: '',
      delimiter: '/',
      object_path: '', // Add required object_path parameter
    };

    const result = await client.listObjects(params);

    expect(result.objects).toBeDefined();
    expect(Array.isArray(result.objects)).toBe(true);
    expect(result.commonPrefixes).toBeDefined();
    expect(Array.isArray(result.commonPrefixes)).toBe(true);
  }, 10000); // Increase timeout for S3 operations
}); 