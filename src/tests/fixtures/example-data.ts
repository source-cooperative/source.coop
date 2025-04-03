import { Repository_v2 } from '../../types/repository_v2';

export const exampleRepositories: Repository_v2[] = [
  {
    repository_id: 'repo1',
    account_id: 'test-account',
    title: 'Repository 1',
    description: 'Test repository 1',
    visibility: 'public',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    metadata: {
      mirrors: {},
      primary_mirror: '',
      roles: {},
    },
  },
  {
    repository_id: 'repo2',
    account_id: 'test-account',
    title: 'Repository 2',
    description: 'Test repository 2',
    visibility: 'restricted',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
    metadata: {
      mirrors: {
        'aws-us-east-1': {
          storage_type: 's3',
          connection_id: 'test-connection',
          prefix: 'test-account/repo2/',
          config: {
            region: 'us-east-1',
            bucket: 'test-bucket',
          },
          is_primary: true,
          sync_status: {
            last_sync_at: '2024-01-04T00:00:00Z',
            is_synced: true,
          },
          stats: {
            total_objects: 100,
            total_size: 1024,
            last_verified_at: '2024-01-04T00:00:00Z',
          },
        },
      },
      primary_mirror: 'aws-us-east-1',
      roles: {},
    },
  },
];

export const _exampleObjects = [
  {
    name: 'file1.txt',
    type: 'file',
    size: 1024,
    hash: 'abc123',
  },
  {
    name: 'folder1',
    type: 'directory',
    size: 0,
    hash: 'def456',
  },
]; 