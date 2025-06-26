import { S3StorageClient } from './s3';
import type { StorageProvider, StorageConfig, ListObjectsParams } from '@/types/storage';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';

const s3Mock = mockClient(S3Client as any);

describe('S3StorageClient', () => {
  const provider: StorageProvider = {
    provider_id: 's3',
    type: 'S3',
    endpoint: 'https://opendata.source.coop',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const config: StorageConfig = {
    type: 'S3',
    endpoint: 'https://opendata.source.coop',
    region: 'us-west-2',
  };

  const client = new S3StorageClient(provider, config);

  beforeEach(() => {
    s3Mock.reset();
  });

  it('should list objects from public bucket', async () => {
    s3Mock.on(ListObjectsV2Command as any).resolves({
      Contents: [{ Key: 'file1.txt' }, { Key: 'file2.txt' }],
      CommonPrefixes: [{ Prefix: 'prefix1/' }, { Prefix: 'prefix2/' }],
      IsTruncated: false,
    } as any);

    const params: ListObjectsParams = {
      account_id: 'fiboa',
      product_id: 'de-mv',
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

  it('should handle missing CommonPrefixes gracefully', async () => {
    s3Mock.on(ListObjectsV2Command as any).resolves({
      Contents: [{ Key: 'file1.txt' }],
      // CommonPrefixes is intentionally omitted
      IsTruncated: false,
    } as any);

    const params: ListObjectsParams = {
      account_id: 'fiboa',
      product_id: 'de-mv',
      prefix: '',
      delimiter: '/',
      object_path: '',
    };

    const result = await client.listObjects(params);
    expect(result.commonPrefixes).toEqual([]);
  });
});