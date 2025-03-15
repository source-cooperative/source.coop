import type { Repository } from '../../src/types';
import { exampleAccounts } from './example-accounts';

export const exampleRepositories: Repository[] = [
  {
    repository_id: 'landsat-collection',
    account: exampleAccounts.find(a => a.account_id === 'nasa')!,
    title: 'Landsat Collection 2 Level-2',
    description: 'Landsat Collection 2 Level-2 Science Products',
    private: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-02-08T00:00:00Z',
    contributors: ['jed'],
    metadata_files: {
      stac: ['stac/catalog.json']
    }
  },
  {
    repository_id: 'goes-collection',
    account: exampleAccounts.find(a => a.account_id === 'noaa')!,
    title: 'GOES-R Series ABI Level 2',
    description: 'GOES-R Series Advanced Baseline Imager Level 2 Products',
    private: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-02-08T00:00:00Z',
    contributors: ['jed'],
    metadata_files: {
      stac: ['stac/catalog.json']
    }
  },
  {
    repository_id: 'sentinel-2',
    account: exampleAccounts.find(a => a.account_id === 'esa')!,
    title: 'Sentinel-2 Level-2A',
    description: 'Sentinel-2 Level-2A Surface Reflectance Products',
    private: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-02-08T00:00:00Z',
    contributors: ['jed'],
    metadata_files: {
      stac: ['stac/catalog.json']
    }
  },
  {
    repository_id: 'naip',
    account: exampleAccounts.find(a => a.account_id === 'usda')!,
    title: 'National Agriculture Imagery Program (NAIP)',
    description: 'High-resolution aerial imagery from NAIP',
    private: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-02-08T00:00:00Z',
    contributors: ['jed'],
    metadata_files: {
      stac: ['stac/catalog.json']
    }
  },
  {
    repository_id: 'era5',
    account: exampleAccounts.find(a => a.account_id === 'ecmwf')!,
    title: 'ERA5 Reanalysis',
    description: 'ERA5 global climate reanalysis',
    private: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-02-08T00:00:00Z',
    contributors: ['jed'],
    metadata_files: {
      stac: ['stac/catalog.json']
    }
  },
  {
    repository_id: 'planetary-computer-reference',
    account: exampleAccounts.find(a => a.account_id === 'planetary-computer')!,
    title: 'Planetary Computer Reference Data',
    description: 'Reference datasets used by the Planetary Computer',
    private: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-02-08T00:00:00Z',
    contributors: ['jed'],
    metadata_files: {
      stac: ['stac/catalog.json']
    }
  }
]; 