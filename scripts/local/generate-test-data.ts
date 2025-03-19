import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import type { Account, Repository } from '@/types';

// Generate a fake Ory ID that matches the format
function generateFakeOryId(): string {
  return `ory_${uuidv4().replace(/-/g, '')}`;
}

// Generate test accounts
const testAccounts: Account[] = [
  // Individual accounts
  {
    account_id: 'jed',
    ory_id: generateFakeOryId(),
    name: 'Jed Sundwall',
    type: 'individual',
    email: 'jed@example.com',
    website: 'https://example.com',
    description: 'System administrator',
    orcid: '0000-0000-0000-0000',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    account_id: 'jane',
    ory_id: generateFakeOryId(),
    name: 'Jane Smith',
    type: 'individual',
    email: 'jane@example.com',
    website: 'https://janesmith.com',
    description: 'Data scientist and researcher',
    orcid: '0000-0000-0000-0001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    account_id: 'john',
    ory_id: generateFakeOryId(),
    name: 'John Doe',
    type: 'individual',
    email: 'john@example.com',
    website: 'https://johndoe.com',
    description: 'Software engineer',
    orcid: '0000-0000-0000-0002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  // Organization accounts
  {
    account_id: 'nasa',
    ory_id: generateFakeOryId(),
    name: 'NASA',
    type: 'organization',
    owner_account_id: 'jed',
    admin_account_ids: ['jed', 'jane'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    account_id: 'esa',
    ory_id: generateFakeOryId(),
    name: 'European Space Agency',
    type: 'organization',
    owner_account_id: 'jane',
    admin_account_ids: ['jane', 'john'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    account_id: 'jpl',
    ory_id: generateFakeOryId(),
    name: 'Jet Propulsion Laboratory',
    type: 'organization',
    owner_account_id: 'nasa',
    admin_account_ids: ['nasa', 'jed'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  // Additional organization accounts from repositories
  {
    account_id: 'microsoft',
    ory_id: generateFakeOryId(),
    name: 'Microsoft',
    type: 'organization',
    owner_account_id: 'jed',
    admin_account_ids: ['jed'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    account_id: 'noaa',
    ory_id: generateFakeOryId(),
    name: 'National Oceanic and Atmospheric Administration',
    type: 'organization',
    owner_account_id: 'jed',
    admin_account_ids: ['jed'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    account_id: 'usgs',
    ory_id: generateFakeOryId(),
    name: 'United States Geological Survey',
    type: 'organization',
    owner_account_id: 'jed',
    admin_account_ids: ['jed'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    account_id: 'usda',
    ory_id: generateFakeOryId(),
    name: 'United States Department of Agriculture',
    type: 'organization',
    owner_account_id: 'jed',
    admin_account_ids: ['jed'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    account_id: 'ecmwf',
    ory_id: generateFakeOryId(),
    name: 'European Centre for Medium-Range Weather Forecasts',
    type: 'organization',
    owner_account_id: 'jed',
    admin_account_ids: ['jed'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    account_id: 'radiant',
    ory_id: generateFakeOryId(),
    name: 'Radiant Earth Foundation',
    type: 'organization',
    owner_account_id: 'jed',
    admin_account_ids: ['jed'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Generate test repositories
const testRepositories: Repository[] = [
  // Microsoft repositories
  {
    repository_id: 'global-building-footprints',
    account: {
      account_id: 'microsoft',
      ory_id: testAccounts[6].ory_id,
      name: 'Microsoft',
      type: 'organization',
      owner_account_id: 'admin',
      admin_account_ids: ['admin'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    title: 'Global Building Footprints',
    description: 'A comprehensive dataset of building footprints derived from satellite imagery using deep learning. This dataset includes AI-generated building footprints across multiple continents, providing valuable data for mapping, urban planning, and humanitarian efforts.',
    private: false,
    created_at: '2024-02-05T15:30:00Z',
    updated_at: '2024-02-06T10:15:00Z',
    metadata_files: {
      stac: ['stac/catalog.json'],
      schema_org: ['metadata/schema_org.json']
    }
  },
  // NOAA repositories
  {
    repository_id: 'noaa-goes18',
    account: {
      account_id: 'noaa',
      ory_id: testAccounts[7].ory_id,
      name: 'National Oceanic and Atmospheric Administration',
      type: 'organization',
      owner_account_id: 'admin',
      admin_account_ids: ['admin'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    title: 'NOAA GOES-18 Full Disk',
    description: 'Full disk imagery from the GOES-18 satellite, providing continuous monitoring of Earth\'s Western Hemisphere. Includes multi-spectral observations at 5-15 minute intervals, enabling real-time weather forecasting, climate monitoring, and natural disaster tracking.',
    private: false,
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-02-07T09:30:00Z',
    metadata_files: {
      stac: ['stac/catalog.json'],
      schema_org: ['metadata/schema_org.json']
    }
  },
  {
    repository_id: 'noaa-nwm',
    account: {
      account_id: 'noaa',
      ory_id: testAccounts[7].ory_id,
      name: 'National Oceanic and Atmospheric Administration',
      type: 'organization',
      owner_account_id: 'admin',
      admin_account_ids: ['admin'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    title: 'National Water Model',
    description: 'High-resolution hydrologic modeling data for streams and rivers across the continental United States. Provides forecast and analysis fields for streamflow, soil moisture, snowpack, and other hydrologic variables at various temporal resolutions.',
    private: false,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-02-07T15:00:00Z',
    metadata_files: {
      stac: ['stac/catalog.json'],
      schema_org: ['metadata/schema_org.json']
    }
  },
  {
    repository_id: 'ghcn',
    account: {
      account_id: 'noaa',
      ory_id: testAccounts[7].ory_id,
      name: 'National Oceanic and Atmospheric Administration',
      type: 'organization',
      owner_account_id: 'admin',
      admin_account_ids: ['admin'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    title: 'Global Historical Climatology Network',
    description: 'Comprehensive global historical climate data from weather stations worldwide. Includes daily measurements of temperature, precipitation, and other meteorological variables, with some records extending back to the 1800s.',
    private: false,
    created_at: '2024-01-12T00:00:00Z',
    updated_at: '2024-02-07T22:00:00Z',
    metadata_files: {
      stac: ['stac/catalog.json'],
      schema_org: ['metadata/schema_org.json']
    }
  },
  {
    repository_id: 'mrms',
    account: {
      account_id: 'noaa',
      ory_id: testAccounts[7].ory_id,
      name: 'National Oceanic and Atmospheric Administration',
      type: 'organization',
      owner_account_id: 'admin',
      admin_account_ids: ['admin'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    title: 'Multi-Radar Multi-Sensor',
    description: 'High-resolution precipitation estimates and other derived products combining multiple radar, satellite, and surface observation networks. Provides near-real-time quantitative precipitation estimation, severe weather detection, and aviation products at 1km resolution.',
    private: false,
    created_at: '2024-01-22T00:00:00Z',
    updated_at: '2024-02-08T01:00:00Z',
    metadata_files: {
      stac: ['stac/catalog.json'],
      schema_org: ['metadata/schema_org.json']
    }
  },
  // USGS repositories
  {
    repository_id: 'landsat-c2-l2',
    account: {
      account_id: 'usgs',
      ory_id: testAccounts[8].ory_id,
      name: 'United States Geological Survey',
      type: 'organization',
      owner_account_id: 'admin',
      admin_account_ids: ['admin'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    title: 'Landsat Collection 2 Level-2',
    description: 'Surface reflectance and surface temperature data from the Landsat satellite program. Collection 2 includes improved atmospheric correction and geometric accuracy, providing consistent data quality across all Landsat missions from 1972 to present.',
    private: false,
    created_at: '2023-12-01T00:00:00Z',
    updated_at: '2024-02-07T06:00:00Z',
    metadata_files: {
      stac: ['stac/catalog.json', 'stac/collection.json'],
      schema_org: ['metadata/schema_org.json'],
      datacite: ['metadata/datacite.json']
    }
  },
  {
    repository_id: '3dep',
    account: {
      account_id: 'usgs',
      ory_id: testAccounts[8].ory_id,
      name: 'United States Geological Survey',
      type: 'organization',
      owner_account_id: 'admin',
      admin_account_ids: ['admin'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    title: '3DEP Lidar',
    description: 'High-quality topographic lidar data for the United States. Provides detailed elevation measurements with point densities of 2-20 points per square meter, supporting applications in flood risk management, infrastructure planning, and natural resource management.',
    private: false,
    created_at: '2024-01-18T00:00:00Z',
    updated_at: '2024-02-08T00:00:00Z',
    metadata_files: {
      stac: ['stac/catalog.json'],
      schema_org: ['metadata/schema_org.json']
    }
  },
  // USDA repositories
  {
    repository_id: 'naip',
    account: {
      account_id: 'usda',
      ory_id: testAccounts[9].ory_id,
      name: 'United States Department of Agriculture',
      type: 'organization',
      owner_account_id: 'admin',
      admin_account_ids: ['admin'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    title: 'National Agriculture Imagery Program (NAIP)',
    description: 'High-resolution aerial imagery covering the continental United States, acquired during the agricultural growing seasons. NAIP imagery is acquired at a one-meter ground sample distance with a horizontal accuracy of within six meters of reference ortho imagery.',
    private: false,
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-02-07T18:00:00Z',
    metadata_files: {
      stac: ['stac/catalog.json'],
      schema_org: ['metadata/schema_org.json']
    }
  },
  // ECMWF repositories
  {
    repository_id: 'era5',
    account: {
      account_id: 'ecmwf',
      ory_id: testAccounts[10].ory_id,
      name: 'European Centre for Medium-Range Weather Forecasts',
      type: 'organization',
      owner_account_id: 'admin',
      admin_account_ids: ['admin'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    title: 'ERA5',
    description: 'Global climate reanalysis dataset providing hourly estimates of atmospheric, land, and oceanic climate variables. Combines model data with observations to create a comprehensive record of global weather and climate from 1940 onwards.',
    private: false,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-02-07T20:00:00Z',
    metadata_files: {
      stac: ['stac/catalog.json'],
      schema_org: ['metadata/schema_org.json']
    }
  },
  // NASA repositories
  {
    repository_id: 'modis-lst',
    account: {
      account_id: 'nasa',
      ory_id: testAccounts[3].ory_id,
      name: 'NASA',
      type: 'organization',
      owner_account_id: 'admin',
      admin_account_ids: ['admin', 'jane'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    title: 'MODIS Land Surface Temperature',
    description: 'Daily land surface temperature and emissivity measurements from the MODIS instruments aboard the Terra and Aqua satellites. Provides global coverage of temperature patterns, enabling monitoring of Earth\'s thermal behavior and climate change impacts.',
    private: false,
    created_at: '2024-01-08T00:00:00Z',
    updated_at: '2024-02-07T21:00:00Z',
    metadata_files: {
      stac: ['stac/catalog.json'],
      schema_org: ['metadata/schema_org.json']
    }
  },
  // ESA repositories
  {
    repository_id: 'worldcover',
    account: {
      account_id: 'esa',
      ory_id: testAccounts[4].ory_id,
      name: 'European Space Agency',
      type: 'organization',
      owner_account_id: 'jane',
      admin_account_ids: ['jane', 'john'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    title: 'ESA WorldCover 2021',
    description: 'Global land cover map at 10m resolution based on Sentinel-1 and Sentinel-2 data. Provides detailed classification of Earth\'s surface into 11 land cover classes with high accuracy, supporting various environmental monitoring and land management applications.',
    private: false,
    created_at: '2024-01-25T00:00:00Z',
    updated_at: '2024-02-07T23:00:00Z',
    metadata_files: {
      stac: ['stac/catalog.json'],
      schema_org: ['metadata/schema_org.json']
    }
  },
  // Radiant repositories
  {
    repository_id: 'ml-training-data',
    account: {
      account_id: 'radiant',
      ory_id: testAccounts[11].ory_id,
      name: 'Radiant Earth Foundation',
      type: 'organization',
      owner_account_id: 'admin',
      admin_account_ids: ['admin'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    title: 'ML Training Data',
    description: 'Machine learning training datasets',
    private: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  }
];

// Generate TypeScript fixtures
const tsFixtures = `
import type { Account, Repository } from '@/types';

export const testAccounts: Account[] = ${JSON.stringify(testAccounts, null, 2)};

export const testRepositories: Repository[] = ${JSON.stringify(testRepositories, null, 2)};
`;

// Write TypeScript fixtures
fs.writeFileSync(
  path.join(__dirname, '../../src/tests/fixtures/test-data.ts'),
  tsFixtures
);

// Write JSON files for DynamoDB
fs.writeFileSync(
  path.join(__dirname, 'accounts.json'),
  JSON.stringify({
    Accounts: testAccounts.map(account => ({
      PutRequest: {
        Item: {
          account_id: { S: account.account_id },
          ory_id: { S: account.ory_id },
          name: { S: account.name },
          type: { S: account.type },
          ...(account.type === 'individual' ? {
            email: { S: account.email },
            website: { S: account.website },
            description: { S: account.description },
            orcid: { S: account.orcid }
          } : {
            owner_account_id: { S: account.owner_account_id },
            admin_account_ids: { SS: account.admin_account_ids }
          }),
          created_at: { S: account.created_at },
          updated_at: { S: account.updated_at }
        }
      }
    }))
  }, null, 2)
);

fs.writeFileSync(
  path.join(__dirname, 'repositories.json'),
  JSON.stringify({
    Repositories: testRepositories.map(repo => ({
      PutRequest: {
        Item: {
          repository_id: { S: repo.repository_id },
          account_id: { S: repo.account.account_id },
          title: { S: repo.title },
          description: { S: repo.description },
          private: { BOOL: repo.private },
          created_at: { S: repo.created_at },
          updated_at: { S: repo.updated_at },
          ...(repo.metadata_files ? {
            metadata_files: {
              M: Object.entries(repo.metadata_files).reduce((acc, [key, value]) => ({
                ...acc,
                [key]: { SS: value }
              }), {})
            }
          } : {})
        }
      }
    }))
  }, null, 2)
);

console.log('Test data generated successfully!'); 