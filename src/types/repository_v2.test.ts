import type {
  Repository_v2,
  RepositoryMirror,
  RepositoryRole,
  AccountRepositoriesIndex,
  PublicRepositoriesIndex
} from './repository_v2';

describe('Repository v2 Types', () => {
  describe('RepositoryMirror', () => {
    it('requires all mandatory fields', () => {
      const mirror: RepositoryMirror = {
        storage_type: 's3',
        connection_id: 'conn123',
        prefix: 'acc123/repo123/',
        config: {},
        is_primary: true,
        sync_status: {
          last_sync_at: new Date().toISOString(),
          is_synced: true
        },
        stats: {
          total_objects: 100,
          total_size: 1024,
          last_verified_at: new Date().toISOString()
        }
      };
      expect(mirror).toBeDefined();
    });

    it('allows optional fields', () => {
      const mirror: RepositoryMirror = {
        storage_type: 's3',
        connection_id: 'conn123',
        prefix: 'acc123/repo123/',
        config: {
          region: 'us-east-1',
          bucket: 'my-bucket'
        },
        is_primary: true,
        sync_status: {
          last_sync_at: new Date().toISOString(),
          is_synced: true,
          error: 'No errors'
        },
        stats: {
          total_objects: 100,
          total_size: 1024,
          last_verified_at: new Date().toISOString()
        }
      };
      expect(mirror).toBeDefined();
    });
  });

  describe('RepositoryRole', () => {
    it('requires all mandatory fields', () => {
      const role: RepositoryRole = {
        account_id: 'acc123',
        role: 'contributor',
        granted_at: new Date().toISOString(),
        granted_by: 'admin123'
      };
      expect(role).toBeDefined();
    });
  });

  describe('Repository_v2', () => {
    it('requires all mandatory fields', () => {
      const repo: Repository_v2 = {
        repository_id: 'repo123',
        account_id: 'acc123',
        title: 'Test Repository',
        description: 'A test repository',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        visibility: 'public',
        metadata: {
          mirrors: {},
          primary_mirror: 'default',
          roles: {}
        }
      };
      expect(repo).toBeDefined();
    });

    it('allows optional fields', () => {
      const repo: Repository_v2 = {
        repository_id: 'repo123',
        account_id: 'acc123',
        title: 'Test Repository',
        description: 'A test repository',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        visibility: 'public',
        metadata: {
          mirrors: {
            'default': {
              storage_type: 's3',
              connection_id: 'conn123',
              prefix: 'acc123/repo123/',
              config: {
                region: 'us-east-1',
                bucket: 'my-bucket'
              },
              is_primary: true,
              sync_status: {
                last_sync_at: new Date().toISOString(),
                is_synced: true
              },
              stats: {
                total_objects: 100,
                total_size: 1024,
                last_verified_at: new Date().toISOString()
              }
            }
          },
          primary_mirror: 'default',
          tags: ['test', 'example'],
          roles: {
            'acc123': {
              account_id: 'acc123',
              role: 'admin',
              granted_at: new Date().toISOString(),
              granted_by: 'acc123'
            }
          }
        }
      };
      expect(repo).toBeDefined();
    });
  });

  describe('AccountRepositoriesIndex', () => {
    it('requires all mandatory fields', () => {
      const index: AccountRepositoriesIndex = {
        account_id: 'acc123',
        created_at: new Date().toISOString(),
        repository_id: 'repo123',
        title: 'Test Repository',
        visibility: 'public'
      };
      expect(index).toBeDefined();
    });
  });

  describe('PublicRepositoriesIndex', () => {
    it('requires all mandatory fields', () => {
      const index: PublicRepositoriesIndex = {
        visibility: 'public',
        created_at: new Date().toISOString(),
        repository_id: 'repo123',
        account_id: 'acc123',
        title: 'Test Repository'
      };
      expect(index).toBeDefined();
    });
  });
}); 