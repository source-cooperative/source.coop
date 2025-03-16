import { Repository, RepositoryStatistics, RepositoryObject } from '@/types';
import { Account } from '@/types';

const exampleAccounts = {
  radiantEarth: {
    account_id: 'radiant',
    name: 'Radiant Earth',
    type: 'organization' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    owner_account_id: 'user1',
    admin_account_ids: ['user1'],
    website: 'https://radiant.earth'
  },
  microsoft: {
    account_id: 'microsoft',
    name: 'Microsoft',
    type: 'organization' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    owner_account_id: 'user2',
    admin_account_ids: ['user2'],
    website: 'https://microsoft.com'
  },
  nasa: {
    account_id: 'nasa',
    name: 'NASA',
    type: 'organization' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    owner_account_id: 'user3',
    admin_account_ids: ['user3'],
    website: 'https://nasa.gov'
  }
};

export const exampleRepositories: Repository[] = [
  {
    repository_id: 'global-building-footprints',
    account: exampleAccounts.microsoft,
    title: 'Global Building Footprints',
    description: 'Building footprints for various regions around the world',
    private: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    default_branch: 'main',
    root_metadata: {
      readme: 'README.md',
      license: 'LICENSE.txt'
    }
  },
  {
    repository_id: 'landsat-collection',
    account: exampleAccounts.nasa,
    title: 'Landsat Collection',
    description: 'Collection of Landsat satellite imagery',
    private: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    metadata_files: {
      stac: ['catalog.json'],
      datacite: ['datacite.json']
    }
  },
  {
    repository_id: 'ml-training-data',
    account: exampleAccounts.radiantEarth,
    title: 'ML Training Data',
    description: 'Machine learning training datasets',
    private: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  }
];

export const exampleObjects: RepositoryObject[] = [
  {
    id: 'data',
    repository_id: 'global-building-footprints',
    path: 'data',
    size: 0,
    type: 'directory',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    checksum: '',
    name: 'data',
    isDirectory: true
  },
  {
    id: 'file1.txt',
    repository_id: 'global-building-footprints',
    path: 'file1.txt',
    size: 1024,
    type: 'file',
    mime_type: 'text/plain',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    checksum: 'abc123',
    name: 'file1.txt',
    isDirectory: false
  }
];

export const exampleSubdirectoryObjects: RepositoryObject[] = [
  {
    id: 'data/file1.txt',
    repository_id: 'global-building-footprints',
    path: 'data/file1.txt',
    size: 1024,
    type: 'file',
    mime_type: 'text/plain',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    checksum: 'def456',
    name: 'file1.txt',
    isDirectory: false
  }
];

export const exampleDeepPathObjects: RepositoryObject[] = [
  {
    id: 'data/subdir/file.txt',
    repository_id: 'global-building-footprints',
    path: 'data/subdir/file.txt',
    size: 1024,
    type: 'file',
    mime_type: 'text/plain',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    checksum: 'ghi789',
    name: 'file.txt',
    isDirectory: false
  }
];

export const exampleRepositoryStatistics: RepositoryStatistics[] = [
  {
    repository_id: "global-building-footprints",
    total_objects: 1250,
    total_bytes: 1024 * 1024 * 1024 * 500, // 500GB
    first_object_at: "2024-01-01T00:00:00Z",
    last_object_at: "2024-02-06T10:15:00Z",
    file_types: {
      "geojson": {
        count: 1000,
        bytes: 1024 * 1024 * 1024 * 400  // 400GB
      },
      "json": {
        count: 250,
        bytes: 1024 * 1024 * 1024 * 100  // 100GB
      }
    }
  },
  {
    repository_id: "noaa-goes18",
    total_objects: 8760,  // ~1 file per hour for a year
    total_bytes: 1024 * 1024 * 1024 * 1024 * 2, // 2TB
    first_object_at: "2024-01-10T00:00:00Z",
    last_object_at: "2024-02-07T09:30:00Z",
    file_types: {
      "nc": {
        count: 8760,
        bytes: 1024 * 1024 * 1024 * 1024 * 2  // 2TB
      }
    }
  }
];

export const exampleStatistics: RepositoryStatistics = {
  repository_id: 'example-repo-1',
  total_objects: 100,
  total_bytes: 1024 * 1024,
  first_object_at: '2024-01-01T00:00:00Z',
  last_object_at: '2024-01-02T00:00:00Z',
  directory_count: 10,
  max_depth: 3
};
