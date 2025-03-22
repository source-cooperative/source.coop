import { DynamoDBClient, CreateTableCommand, DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import type { Account, Repository, OrganizationalAccount, IndividualAccount } from '@/types';

const execAsync = promisify(exec);
const client = new DynamoDBClient({
  endpoint: "http://localhost:8000",
  region: "us-east-1",
  credentials: {
    accessKeyId: "local",
    secretAccessKey: "local"
  }
});

const docClient = DynamoDBDocument.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

async function deleteTable(tableName: string) {
  try {
    await client.send(new DeleteTableCommand({
      TableName: tableName
    }));
    console.log(`✓ Deleted ${tableName} table`);
  } catch (e) {
    if ((e as any).name === 'ResourceNotFoundException') {
      console.log(`→ ${tableName} table does not exist`);
    } else {
      console.error(`✗ Error deleting ${tableName} table:`, e);
    }
  }
}

async function createTables() {
  // Delete existing tables
  await deleteTable("Repositories");
  await deleteTable("Accounts");
  
  // Wait for tables to be fully deleted
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Create tables
  try {
    await client.send(new CreateTableCommand({
      TableName: "Accounts",
      AttributeDefinitions: [
        { AttributeName: "account_id", AttributeType: "S" },
        { AttributeName: "type", AttributeType: "S" },
        { AttributeName: "email", AttributeType: "S" }
      ],
      KeySchema: [
        { AttributeName: "account_id", KeyType: "HASH" },
        { AttributeName: "type", KeyType: "RANGE" }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "GSI1",
          KeySchema: [
            { AttributeName: "type", KeyType: "HASH" },
            { AttributeName: "account_id", KeyType: "RANGE" }
          ],
          Projection: {
            ProjectionType: "ALL"
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        },
        {
          IndexName: "GSI2",
          KeySchema: [
            { AttributeName: "email", KeyType: "HASH" },
            { AttributeName: "account_id", KeyType: "RANGE" }
          ],
          Projection: {
            ProjectionType: "ALL"
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }));
    console.log("✓ Created Accounts table");
  } catch (e) {
    console.error("✗ Error creating Accounts table:", e);
    throw e;
  }

  try {
    await client.send(new CreateTableCommand({
      TableName: "Repositories",
      AttributeDefinitions: [
        { AttributeName: "repository_id", AttributeType: "S" },
        { AttributeName: "account_id", AttributeType: "S" },
        { AttributeName: "created_at", AttributeType: "S" }
      ],
      KeySchema: [
        { AttributeName: "repository_id", KeyType: "HASH" },
        { AttributeName: "account_id", KeyType: "RANGE" }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "GSI1",
          KeySchema: [
            { AttributeName: "account_id", KeyType: "HASH" },
            { AttributeName: "created_at", KeyType: "RANGE" }
          ],
          Projection: {
            ProjectionType: "ALL"
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }));
    console.log("✓ Created Repositories table with account_id GSI");
  } catch (e) {
    console.error("✗ Error creating Repositories table:", e);
    throw e;
  }

  // Wait for tables to be fully created
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// Helper to get all directories in a path
function getDirectories(path: string): string[] {
  return fs.readdirSync(path, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
}

// Define individual user accounts
const individualUsers: Omit<IndividualAccount, 'ory_id' | 'created_at' | 'updated_at'>[] = [
  {
    account_id: 'admin',
    name: 'Admin User',
    type: 'individual',
    email: 'admin@example.com'
  },
  {
    account_id: 'sarah',
    name: 'Sarah Johnson',
    type: 'individual',
    email: 'sarah.johnson@example.com',
    websites: [{ url: 'https://sarahjohnson.dev' }],
    description: 'Earth scientist specializing in climate data analysis'
  },
  {
    account_id: 'carlos',
    name: 'Carlos Rodriguez',
    type: 'individual',
    email: 'carlos.rodriguez@example.com',
    orcid: '0000-0002-1825-0097',
    description: 'Marine biologist researching coral reef ecosystems'
  },
  {
    account_id: 'wei',
    name: 'Wei Zhang',
    type: 'individual',
    email: 'wei.zhang@example.com',
    orcid: '0000-0001-5909-4358',
    description: 'Data scientist working on remote sensing applications'
  },
  {
    account_id: 'aisha',
    name: 'Aisha Patel',
    type: 'individual',
    email: 'aisha.patel@example.com',
    websites: [{ url: 'https://aishapatel.net' }],
    description: 'GIS specialist focusing on urban development'
  },
  {
    account_id: 'michael',
    name: 'Michael Thompson',
    type: 'individual',
    email: 'michael.thompson@example.com',
    description: 'Software engineer developing open-source geospatial tools'
  }
];

// Organization-to-Individual relationships
type OrgRelationships = {
  [orgId: string]: {
    owner: string;
    admins: string[];
    members?: string[];
  }
};

const orgRelationships: OrgRelationships = {
  'noaa': {
    owner: 'sarah',
    admins: ['sarah', 'admin'],
    members: ['carlos', 'wei']
  },
  'nasa': {
    owner: 'michael',
    admins: ['michael', 'admin', 'wei'],
    members: ['sarah', 'aisha']
  },
  'usgs': {
    owner: 'aisha',
    admins: ['aisha', 'admin'],
    members: ['sarah', 'carlos']
  },
  'esa': {
    owner: 'carlos',
    admins: ['carlos', 'admin'],
    members: ['wei', 'michael']
  },
  'ecmwf': {
    owner: 'wei',
    admins: ['wei', 'admin'],
    members: ['sarah', 'michael']
  },
  'planetary-computer': {
    owner: 'aisha',
    admins: ['aisha', 'michael', 'admin'],
    members: ['wei', 'sarah']
  },
  'usda': {
    owner: 'michael',
    admins: ['michael', 'admin'],
    members: ['aisha', 'sarah']
  },
  'radiant': {
    owner: 'wei',
    admins: ['wei', 'admin', 'aisha'],
    members: ['michael', 'carlos']
  },
  'microsoft': {
    owner: 'sarah',
    admins: ['sarah', 'admin', 'michael'],
    members: ['wei', 'aisha', 'carlos']
  }
};

const organizationNames: Record<string, string> = {
  'noaa': 'National Oceanic and Atmospheric Administration',
  'nasa': 'NASA',
  'usgs': 'United States Geological Survey',
  'esa': 'European Space Agency',
  'ecmwf': 'European Centre for Medium-Range Weather Forecasts',
  'planetary-computer': 'Microsoft Planetary Computer',
  'usda': 'United States Department of Agriculture',
  'radiant': 'Radiant Earth Foundation',
  'microsoft': 'Microsoft Corporation'
};

// Repository information by organization - more descriptive names and IDs
type RepositoryInfo = {
  id: string;
  title: string;
  description: string;
};

const repositoryTemplates: Record<string, RepositoryInfo[]> = {
  'noaa': [
    {
      id: 'goes-r-imagery',
      title: 'GOES-R Satellite Imagery',
      description: "A comprehensive collection of imagery from the GOES-R series of geostationary weather satellites. This repository provides access to NOAA's extensive meteorological imagery datasets, supporting research and operational applications in weather forecasting and atmospheric science."
    },
    {
      id: 'global-ocean-data',
      title: 'Global Ocean Data Repository',
      description: "An archive of oceanographic data and analysis tools, featuring bathymetric surveys, current measurements, and marine ecosystem observations from NOAA's global monitoring system. This repository serves as a central hub for ocean research and coastal management applications."
    },
    {
      id: 'climate-data-record',
      title: 'Climate Data Record',
      description: "A specialized collection of climate data records and derived products, focusing on long-term climate trends and patterns. This repository includes processing tools and visualization utilities for climate analysis spanning multiple decades of observations."
    }
  ],
  'nasa': [
    {
      id: 'landsat-collection-2',
      title: 'Landsat Collection 2',
      description: "A curated collection of Landsat Collection 2 data products, including surface reflectance, surface temperature, and analysis-ready data. This repository provides tools for accessing and analyzing multi-temporal Earth observation data from the Landsat satellite program."
    },
    {
      id: 'modis-terra-aqua',
      title: 'MODIS Terra and Aqua Collections',
      description: "An archive of MODIS (Moderate Resolution Imaging Spectroradiometer) data from Terra and Aqua satellites, featuring atmospheric, land, and ocean products. This repository includes analysis tools for various Earth system processes."
    },
    {
      id: 'earth-science-dashboard',
      title: 'Earth Science Dashboard',
      description: "A comprehensive collection of visualization tools and data products for monitoring Earth's vital signs. This repository supports research in Earth system science, climate change, and environmental monitoring."
    }
  ],
  'usgs': [
    {
      id: 'national-geologic-map',
      title: 'National Geologic Map Database',
      description: "A detailed collection of geological maps and associated data products, covering various regions and geological time periods. This repository includes tools for geological mapping and stratigraphic analysis across the United States."
    },
    {
      id: 'water-data',
      title: 'National Water Information System',
      description: "An archive of hydrological data and modeling tools, featuring streamflow measurements, groundwater data, and water quality parameters. This repository supports water resource management and research throughout the United States."
    },
    {
      id: 'earthquake-data',
      title: 'Earthquake Hazards Program Data',
      description: "A specialized collection of earthquake and seismic data, including historical records and real-time monitoring tools. This repository provides access to USGS's comprehensive seismic network data and earthquake hazard assessments."
    }
  ],
  'esa': [
    {
      id: 'sentinel-hub',
      title: 'Sentinel Hub - Copernicus Data',
      description: "A comprehensive collection of Earth observation data from ESA's Copernicus program, including Sentinel satellite imagery and derived products. This repository provides tools for accessing and processing European space data for environmental monitoring."
    },
    {
      id: 'climate-change-initiative',
      title: 'Climate Change Initiative',
      description: "An archive of climate variables essential for understanding climate change, derived from multiple satellite missions. This repository includes analysis tools for climate research and supports policy development."
    },
    {
      id: 'aeolus-wind-data',
      title: 'Aeolus Wind Data',
      description: "A collection of global wind profile data from the Aeolus satellite mission, featuring measurements of Earth's wind patterns. This repository supports meteorological research and weather forecasting improvements."
    }
  ],
  'ecmwf': [
    {
      id: 'era5-reanalysis',
      title: 'ERA5 Reanalysis',
      description: "A comprehensive collection of climate reanalysis data, combining model data with observations from across the world into globally complete and consistent datasets. This repository provides access to ECMWF's extensive ERA5 climate reanalysis."
    },
    {
      id: 'seasonal-forecast',
      title: 'Seasonal Forecast System',
      description: "An archive of seasonal climate forecast model outputs, featuring ensemble predictions for multiple months ahead. This repository supports climate research and seasonal prediction applications worldwide."
    },
    {
      id: 'atmospheric-composition',
      title: 'Atmospheric Composition Data',
      description: "A specialized collection of atmospheric composition data and analysis tools, focusing on air quality and atmospheric chemistry. This repository includes processing utilities for monitoring greenhouse gases, aerosols, and other atmospheric constituents."
    }
  ],
  'planetary-computer': [
    {
      id: 'global-land-cover',
      title: 'Global Land Cover Mapping',
      description: "A curated collection of global land cover data products and analysis tools, featuring high-resolution imagery and derived classification products. This repository provides access to Microsoft's planetary-scale land cover mapping resources."
    },
    {
      id: 'biodiversity-data',
      title: 'Biodiversity Data and Analytics',
      description: "An archive of biodiversity observations and machine learning models, supporting research in conservation biology and ecosystem monitoring. This repository includes tools for large-scale biodiversity analysis."
    },
    {
      id: 'forest-carbon-monitoring',
      title: 'Forest Carbon Monitoring',
      description: "A comprehensive collection of forest monitoring data and carbon estimation tools, featuring remote sensing and ground-based observations. This repository supports forest conservation and carbon accounting applications."
    }
  ],
  'usda': [
    {
      id: 'cropland-data-layer',
      title: 'Cropland Data Layer',
      description: "A detailed collection of agricultural crop type data products and analysis tools, including annual crop type maps and statistics. This repository supports agricultural research and policy development."
    },
    {
      id: 'forest-inventory',
      title: 'Forest Inventory and Analysis',
      description: "An archive of forest inventory data and analysis tools, featuring forest health monitoring and management resources. This repository provides access to USDA's comprehensive forest resource assessments."
    },
    {
      id: 'soil-survey',
      title: 'National Soil Survey',
      description: "A specialized collection of soil data and analysis tools, including soil types, properties, and suitability assessments. This repository supports agricultural planning, environmental management, and research applications."
    }
  ],
  'radiant': [
    {
      id: 'geospatial-ml',
      title: 'Geospatial Machine Learning Resources',
      description: "A curated collection of Earth observation data products and machine learning tools, focusing on sustainable development applications. This repository provides access to Radiant's geospatial machine learning resources."
    },
    {
      id: 'sustainable-development',
      title: 'Sustainable Development Monitoring',
      description: "An archive of environmental monitoring data and analysis tools, featuring indicators for tracking progress toward sustainable development goals. This repository supports international development research and policy evaluation."
    },
    {
      id: 'open-training-data',
      title: 'Open Training Data for AI',
      description: "A comprehensive collection of geospatial training data for machine learning, supporting research in remote sensing and Earth observation. This repository includes labeled datasets for various environmental applications."
    }
  ],
  'microsoft': [
    {
      id: 'building-footprints',
      title: 'Global Building Footprints',
      description: "A collection of building footprint data derived from satellite imagery using AI techniques. This repository provides access to Microsoft's global building detection results for urban planning and development applications."
    },
    {
      id: 'environmental-insights',
      title: 'Environmental Insights Explorer',
      description: "An archive of environmental data and analytics, supporting research in climate change mitigation and adaptation. This repository includes tools for urban environmental analysis and planning."
    },
    {
      id: 'agriculture-intelligence',
      title: 'Agriculture Intelligence',
      description: "A specialized collection of agricultural data and analysis tools, featuring crop monitoring and yield prediction models. This repository supports precision agriculture and food security applications worldwide."
    }
  ]
};

// Repositories owned by individual users
const individualRepositories: Record<string, RepositoryInfo[]> = {
  'sarah': [
    {
      id: 'climate-analytics',
      title: 'Climate Analytics Toolkit',
      description: "A toolkit for climate data analysis, featuring statistical methods and visualization tools developed during my research. This repository includes Jupyter notebooks, R scripts, and sample datasets for getting started with climate data analysis."
    },
    {
      id: 'arctic-sea-ice',
      title: 'Arctic Sea Ice Monitoring',
      description: "A collection of tools and data for monitoring Arctic sea ice extent and thickness. This repository contains processed data products, visualization tools, and analysis scripts for sea ice research."
    }
  ],
  'carlos': [
    {
      id: 'coral-reef-assessment',
      title: 'Coral Reef Assessment Framework',
      description: "A framework for coral reef health assessment based on multispectral imagery and field data. This repository includes processing tools, classification models, and visualization utilities for coral reef monitoring."
    }
  ],
  'wei': [
    {
      id: 'satellite-imagery-toolkit',
      title: 'Satellite Imagery Processing Toolkit',
      description: "A comprehensive toolkit for processing satellite imagery using machine learning techniques. This repository contains preprocessing tools, model architectures, and example applications for various remote sensing tasks."
    },
    {
      id: 'crop-yield-prediction',
      title: 'Crop Yield Prediction Models',
      description: "A collection of models for predicting crop yields based on satellite imagery, weather data, and historical yields. This repository includes data processing scripts, model implementations, and evaluation tools."
    }
  ],
  'aisha': [
    {
      id: 'urban-growth-analysis',
      title: 'Urban Growth Analysis Framework',
      description: "A framework for analyzing urban growth patterns using satellite imagery and geospatial data. This repository contains processing tools, analysis scripts, and visualization utilities for urban research."
    }
  ],
  'michael': [
    {
      id: 'open-geo-tools',
      title: 'Open Geospatial Tools',
      description: "A collection of open-source tools for working with geospatial data. This repository includes utilities for format conversion, coordinate system transformations, and spatial analysis."
    },
    {
      id: 'vector-tile-renderer',
      title: 'Vector Tile Renderer',
      description: "A high-performance renderer for vector tiles, supporting various styling options and interactive features. This repository includes the core rendering engine, style editor, and example applications."
    }
  ]
};

// Helper to generate a fake Ory ID
function generateFakeOryId(): string {
  return `ory_${Math.random().toString(36).substring(2, 15)}`;
}

async function setupTestData() {
  console.log('Setting up test data...');

  // Create test accounts based on test-storage structure
  const testStoragePath = path.join(process.cwd(), 'test-storage');
  
  // Create test-storage directory if it doesn't exist
  if (!fs.existsSync(testStoragePath)) {
    fs.mkdirSync(testStoragePath, { recursive: true });
  }

  // Get directories from test-storage (each is an account)
  const accountDirs = getDirectories(testStoragePath);
  const accounts: Account[] = []; 
  const repositories: Repository[] = [];

  // First create individual user accounts
  const individualAccounts = individualUsers.map(user => {
    const account: IndividualAccount = {
      ...user,
      ory_id: generateFakeOryId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return account;
  });
  
  accounts.push(...individualAccounts);
  console.log(`Created ${individualAccounts.length} individual accounts`);

  // Create organization accounts and link to individual users
  for (const accountId of accountDirs) {
    const accountDir = path.join(testStoragePath, accountId);
    
    // Get relationship info or use defaults
    const relationships = orgRelationships[accountId] || { 
      owner: 'admin', 
      admins: ['admin'] 
    };

    // Create organization account
    const orgAccount: OrganizationalAccount = {
      account_id: accountId,
      ory_id: generateFakeOryId(),
      name: organizationNames[accountId] || accountId.charAt(0).toUpperCase() + accountId.slice(1).replace(/-/g, ' '),
      type: 'organization',
      owner_account_id: relationships.owner,
      admin_account_ids: relationships.admins,
      member_account_ids: relationships.members,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    accounts.push(orgAccount);

    // Check existing repository directories
    const existingRepoDirs = getDirectories(accountDir);
    
    // If no repositories exist, create them based on templates
    if (existingRepoDirs.length === 0) {
      const repoTemplates = repositoryTemplates[accountId] || [];
      
      // Use templates if available, otherwise create generic repos
      if (repoTemplates.length > 0) {
        for (const template of repoTemplates) {
          const repoPath = path.join(accountDir, template.id);
          
          // Create repository directory
          fs.mkdirSync(repoPath, { recursive: true });
          
          // Create README.md with basic content
          fs.writeFileSync(
            path.join(repoPath, 'README.md'),
            `# ${template.title}\n\nBasic repository information.\n`
          );
          
          existingRepoDirs.push(template.id);
        }
      } else {
        // Create generic repositories if no templates
        const numRepos = Math.floor(Math.random() * 2) + 2; // 2-3 repositories
        for (let i = 0; i < numRepos; i++) {
          const repoId = `${accountId}-repo-${i + 1}`;
          const repoPath = path.join(accountDir, repoId);
          
          // Create repository directory
          fs.mkdirSync(repoPath, { recursive: true });
          
          // Create README.md with basic content
          fs.writeFileSync(
            path.join(repoPath, 'README.md'),
            `# ${orgAccount.name} Repository ${i + 1}\n\nBasic repository information.\n`
          );
          
          existingRepoDirs.push(repoId);
        }
      }
    }
    
    // Create repository objects for each directory
    for (const repoId of existingRepoDirs) {
      // Find matching template if it exists
      const template = (repositoryTemplates[accountId] || []).find(t => t.id === repoId);
      
      const repository: Repository = {
        repository_id: repoId,
        account: orgAccount,
        title: template ? template.title : `${orgAccount.name} - ${repoId}`,
        description: template ? template.description : 
                   `A comprehensive collection of data products and analysis tools from ${orgAccount.name}, supporting research and operational applications in various domains.`,
        private: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      repositories.push(repository);
    }
  }

  // Create directories and repositories for individual users
  for (const [userId, userRepos] of Object.entries(individualRepositories)) {
    const userAccount = individualAccounts.find(acc => acc.account_id === userId);
    if (!userAccount) continue;

    // Create user directory if it doesn't exist
    const userDir = path.join(testStoragePath, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    // Create repositories for this user
    for (const repo of userRepos) {
      const repoPath = path.join(userDir, repo.id);
      
      // Create repository directory if it doesn't exist
      if (!fs.existsSync(repoPath)) {
        fs.mkdirSync(repoPath, { recursive: true });
        
        // Create README.md with basic content
        fs.writeFileSync(
          path.join(repoPath, 'README.md'),
          `# ${repo.title}\n\n${repo.description}\n`
        );
      }
      
      // Create repository object
      const repository: Repository = {
        repository_id: repo.id,
        account: userAccount,
        title: repo.title,
        description: repo.description,
        private: false, // could randomly set some to private
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      repositories.push(repository);
    }
  }

  // Write to DynamoDB
  console.log('Writing accounts to DynamoDB...');
  for (const account of accounts) {
    // Add type field based on account type
    const accountItem = {
      ...account,
      type: account.type || 'individual' // Default to individual if not specified
    };
    
    await docClient.put({
      TableName: "Accounts",
      Item: accountItem
    });
  }
  console.log(`✓ Created ${accounts.length} accounts`);

  console.log('Writing repositories to DynamoDB...');
  for (const repository of repositories) {
    // Prepare Repository for DynamoDB (can't store the full account object)
    const repoItem = {
      repository_id: repository.repository_id,
      account_id: repository.account.account_id,
      title: repository.title,
      description: repository.description,
      private: repository.private,
      created_at: repository.created_at,
      updated_at: repository.updated_at
    };
    
    await docClient.put({
      TableName: "Repositories",
      Item: repoItem
    });
  }
  console.log(`✓ Created ${repositories.length} repositories`);
}

async function main() {
  try {
    console.log('Initializing local development environment...');
    
    // Create DynamoDB tables
    await createTables();
    
    // Setup test data
    await setupTestData();
    
    console.log('\nLocal development environment setup complete!');
  } catch (error) {
    console.error('Error setting up local environment:', error);
    process.exit(1);
  }
}

main(); 