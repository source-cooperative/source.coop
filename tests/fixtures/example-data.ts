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
    website: 'https://radiant.earth',
    ory_id: 'radiant-earth'
  },
  microsoft: {
    account_id: 'microsoft',
    name: 'Microsoft',
    type: 'organization' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    owner_account_id: 'user2',
    admin_account_ids: ['user2'],
    website: 'https://microsoft.com',
    ory_id: 'microsoft'
  },
  nasa: {
    account_id: 'nasa',
    name: 'NASA',
    type: 'organization' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    owner_account_id: 'user3',
    admin_account_ids: ['user3'],
    website: 'https://nasa.gov',
    ory_id: 'nasa'
  },
  noaa: {
    account_id: 'noaa',
    name: 'National Oceanic and Atmospheric Administration',
    type: 'organization' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    owner_account_id: 'user4',
    admin_account_ids: ['user4'],
    website: 'https://noaa.gov',
    ory_id: 'noaa'
  },
  esa: {
    account_id: 'esa',
    name: 'European Space Agency',
    type: 'organization' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    owner_account_id: 'user5',
    admin_account_ids: ['user5'],
    website: 'https://www.esa.int',
    ory_id: 'esa'
  },
  usgs: {
    account_id: 'usgs',
    name: 'United States Geological Survey',
    type: 'organization' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    owner_account_id: 'user6',
    admin_account_ids: ['user6'],
    website: 'https://www.usgs.gov',
    ory_id: 'usgs'
  },
  ecmwf: {
    account_id: 'ecmwf',
    name: 'European Centre for Medium-Range Weather Forecasts',
    type: 'organization' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    owner_account_id: 'user7',
    admin_account_ids: ['user7'],
    website: 'https://www.ecmwf.int',
    ory_id: 'ecmwf'
  },
  planetaryComputer: {
    account_id: 'planetary-computer',
    name: 'Planetary Computer',
    type: 'organization' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    owner_account_id: 'user8',
    admin_account_ids: ['user8'],
    website: 'https://planetarycomputer.microsoft.com',
    ory_id: 'planetary-computer'
  },
  usda: {
    account_id: 'usda',
    name: 'United States Department of Agriculture',
    type: 'organization' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    owner_account_id: 'user9',
    admin_account_ids: ['user9'],
    website: 'https://www.usda.gov',
    ory_id: 'usda'
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
  },
  {
    repository_id: 'sentinel-2',
    account: exampleAccounts.esa,
    title: 'Sentinel-2 Level-2A',
    description: 'Sentinel-2 Level-2A Surface Reflectance Products',
    private: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    metadata_files: {
      stac: ['catalog.json']
    }
  },
  {
    repository_id: 'goes-18',
    account: exampleAccounts.noaa,
    title: 'GOES-18 Level 2 Products',
    description: 'GOES-18 Advanced Baseline Imager Level 2 Products',
    private: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    metadata_files: {
      stac: ['catalog.json']
    }
  },
  {
    repository_id: 'naip',
    account: exampleAccounts.usda,
    title: 'National Agriculture Imagery Program',
    description: 'High-resolution aerial imagery from NAIP',
    private: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    metadata_files: {
      stac: ['catalog.json']
    }
  },
  {
    repository_id: 'era5',
    account: exampleAccounts.ecmwf,
    title: 'ERA5 Reanalysis',
    description: 'ERA5 global climate reanalysis',
    private: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    metadata_files: {
      stac: ['catalog.json']
    }
  },
  {
    repository_id: 'reference-data',
    account: exampleAccounts.planetaryComputer,
    title: 'Planetary Computer Reference Data',
    description: 'Reference datasets used by the Planetary Computer',
    private: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    metadata_files: {
      stac: ['catalog.json']
    }
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
