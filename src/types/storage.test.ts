import type {
  StorageType,
  StorageProvider,
  StorageConfig,
  ObjectPath,
  StorageLocation,
  ListObjectsParams,
  ListObjectsResult,
  GetObjectParams,
  GetObjectResult,
  PutObjectParams,
  PutObjectResult,
  DeleteObjectParams,
  StorageClient,
} from './storage';
import type { RepositoryObject } from './repository_object';

describe('Storage Types', () => {
  describe('StorageType', () => {
    it('allows valid storage types', () => {
      const validTypes: StorageType[] = ['LOCAL', 'S3', 'GCS', 'AZURE'];
      expect(validTypes).toBeDefined();
    });
  });

  describe('StorageProvider', () => {
    it('requires all mandatory fields', () => {
      const provider: StorageProvider = {
        provider_id: 'test-provider',
        type: 'S3',
        endpoint: 'https://s3.amazonaws.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      expect(provider).toBeDefined();
    });
  });

  describe('StorageConfig', () => {
    it('requires all mandatory fields', () => {
      const config: StorageConfig = {
        type: 'S3',
        endpoint: 'https://s3.amazonaws.com',
      };
      expect(config).toBeDefined();
    });

    it('allows optional fields', () => {
      const config: StorageConfig = {
        type: 'S3',
        endpoint: 'https://s3.amazonaws.com',
        region: 'us-east-1',
        options: {
          forcePathStyle: true,
        },
      };
      expect(config).toBeDefined();
    });
  });

  describe('ObjectPath', () => {
    it('requires all mandatory fields', () => {
      const path: ObjectPath = {
        account_id: 'test-account',
        repository_id: 'test-repo',
        object_path: 'test/path',
      };
      expect(path).toBeDefined();
    });
  });

  describe('StorageLocation', () => {
    it('requires all mandatory fields', () => {
      const location: StorageLocation = {
        provider: {
          provider_id: 'test-provider',
          type: 'S3',
          endpoint: 'https://s3.amazonaws.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        path: 'test/path',
      };
      expect(location).toBeDefined();
    });
  });

  describe('ListObjectsParams', () => {
    it('requires all mandatory fields', () => {
      const params: ListObjectsParams = {
        account_id: 'test-account',
        repository_id: 'test-repo',
        object_path: 'test/path',
      };
      expect(params).toBeDefined();
    });

    it('allows optional fields', () => {
      const params: ListObjectsParams = {
        account_id: 'test-account',
        repository_id: 'test-repo',
        object_path: 'test/path',
        prefix: 'test/',
        delimiter: '/',
        maxKeys: 100,
        continuationToken: 'token',
      };
      expect(params).toBeDefined();
    });
  });

  describe('ListObjectsResult', () => {
    it('requires all mandatory fields', () => {
      const result: ListObjectsResult = {
        objects: [],
        commonPrefixes: [],
        isTruncated: false,
      };
      expect(result).toBeDefined();
    });

    it('allows optional fields', () => {
      const result: ListObjectsResult = {
        objects: [],
        commonPrefixes: [],
        isTruncated: false,
        nextContinuationToken: 'token',
      };
      expect(result).toBeDefined();
    });
  });

  describe('GetObjectParams', () => {
    it('requires all mandatory fields', () => {
      const params: GetObjectParams = {
        account_id: 'test-account',
        repository_id: 'test-repo',
        object_path: 'test/path',
      };
      expect(params).toBeDefined();
    });

    it('allows optional fields', () => {
      const params: GetObjectParams = {
        account_id: 'test-account',
        repository_id: 'test-repo',
        object_path: 'test/path',
        versionId: 'v1',
      };
      expect(params).toBeDefined();
    });
  });

  describe('GetObjectResult', () => {
    it('requires all mandatory fields', () => {
      const result: GetObjectResult = {
        object: {} as RepositoryObject,
        data: Buffer.from('test'),
        contentType: 'text/plain',
        contentLength: 4,
        etag: 'test-etag',
        lastModified: new Date(),
      };
      expect(result).toBeDefined();
    });
  });

  describe('PutObjectParams', () => {
    it('requires all mandatory fields', () => {
      const params: PutObjectParams = {
        account_id: 'test-account',
        repository_id: 'test-repo',
        object_path: 'test/path',
        data: Buffer.from('test'),
        contentType: 'text/plain',
      };
      expect(params).toBeDefined();
    });

    it('allows optional fields', () => {
      const params: PutObjectParams = {
        account_id: 'test-account',
        repository_id: 'test-repo',
        object_path: 'test/path',
        data: Buffer.from('test'),
        contentType: 'text/plain',
        metadata: { key: 'value' },
      };
      expect(params).toBeDefined();
    });
  });

  describe('PutObjectResult', () => {
    it('requires all mandatory fields', () => {
      const result: PutObjectResult = {
        etag: 'test-etag',
      };
      expect(result).toBeDefined();
    });

    it('allows optional fields', () => {
      const result: PutObjectResult = {
        etag: 'test-etag',
        versionId: 'v1',
      };
      expect(result).toBeDefined();
    });
  });

  describe('DeleteObjectParams', () => {
    it('requires all mandatory fields', () => {
      const params: DeleteObjectParams = {
        account_id: 'test-account',
        repository_id: 'test-repo',
        object_path: 'test/path',
      };
      expect(params).toBeDefined();
    });

    it('allows optional fields', () => {
      const params: DeleteObjectParams = {
        account_id: 'test-account',
        repository_id: 'test-repo',
        object_path: 'test/path',
        versionId: 'v1',
      };
      expect(params).toBeDefined();
    });
  });

  describe('StorageClient', () => {
    it('requires all mandatory methods', () => {
      const client: StorageClient = {
        listObjects: async () => ({
          objects: [],
          commonPrefixes: [],
          isTruncated: false,
        }),
        getObjectInfo: async () => ({} as RepositoryObject),
        getObject: async () => ({
          object: {} as RepositoryObject,
          data: Buffer.from(''),
          contentType: 'text/plain',
          contentLength: 0,
          etag: 'test-etag',
          lastModified: new Date(),
        }),
        putObject: async () => ({
          etag: 'test-etag',
        }),
        deleteObject: async () => undefined,
      };
      expect(client).toBeDefined();
    });
  });
}); 