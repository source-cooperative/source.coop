import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import type { Account, Repository, OrganizationalAccount } from '@/types';

const execAsync = promisify(exec);

// Helper to get all directories in a path
function getDirectories(path: string): string[] {
  return fs.readdirSync(path, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
}

// Helper to check if a directory contains a repository
function isRepository(dir: string): boolean {
  return true; // Any directory is a repository
}

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

// Helper to generate a fake Ory ID
function generateFakeOryId(): string {
  return `ory_${Math.random().toString(36).substring(2, 15)}`;
}

// Helper to format DynamoDB item
function formatDynamoDBItem(item: Record<string, any>): string {
  const formattedItem: Record<string, any> = {};
  for (const [key, value] of Object.entries(item)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      formattedItem[key] = { L: value.map(v => ({ S: v })) };
    } else if (typeof value === 'boolean') {
      formattedItem[key] = { BOOL: value };
    } else {
      formattedItem[key] = { S: value.toString() };
    }
  }
  return JSON.stringify(formattedItem);
}

async function setupTestData() {
  console.log('Setting up test data...');

  // Create test accounts based on test-storage structure
  const testStoragePath = path.join(process.cwd(), 'test-storage');
  const accountDirs = getDirectories(testStoragePath);
  
  const accounts: Account[] = [];
  const repositories: Repository[] = [];

  // Create accounts
  for (const accountId of accountDirs) {
    const accountDir = path.join(testStoragePath, accountId);
    const repoDirs = getDirectories(accountDir);
    
    // Create account
    const account: Account = {
      account_id: accountId,
      ory_id: generateFakeOryId(),
      name: organizationNames[accountId] || accountId.charAt(0).toUpperCase() + accountId.slice(1).replace(/-/g, ' '),
      type: 'organization',
      owner_account_id: 'admin',
      admin_account_ids: ['admin'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    accounts.push(account);

    // Create repositories
    for (const repoId of repoDirs) {
      const repoDir = path.join(accountDir, repoId);
      if (isRepository(repoDir)) {
        const repository: Repository = {
          repository_id: repoId,
          account: account,
          title: repoId.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          description: `Test repository for ${account.name}`,
          private: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata_files: {
            stac: ['stac/catalog.json']
          }
        };
        repositories.push(repository);
      }
    }
  }

  // Add admin account
  const adminAccount: Account = {
    account_id: 'admin',
    ory_id: generateFakeOryId(),
    name: 'Admin User',
    type: 'individual',
    email: 'admin@example.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  accounts.push(adminAccount);

  // Write to DynamoDB
  console.log('Writing accounts to DynamoDB...');
  for (const account of accounts) {
    const item = {
      account_id: account.account_id,
      type: account.type,
      name: account.name,
      created_at: account.created_at,
      updated_at: account.updated_at,
      ...(account.email && { email: account.email }),
      ...(account.type === 'organization' && {
        owner_account_id: (account as OrganizationalAccount).owner_account_id,
        admin_account_ids: (account as OrganizationalAccount).admin_account_ids
      })
    };
    
    await execAsync(`aws dynamodb put-item --endpoint-url http://localhost:8000 --table-name Accounts --item '${formatDynamoDBItem(item)}'`);
  }

  console.log('Writing repositories to DynamoDB...');
  for (const repository of repositories) {
    const item = {
      repository_id: repository.repository_id,
      account_id: repository.account.account_id,
      title: repository.title,
      description: repository.description,
      created_at: repository.created_at,
      updated_at: repository.updated_at,
      private: repository.private
    };
    
    await execAsync(`aws dynamodb put-item --endpoint-url http://localhost:8000 --table-name Repositories --item '${formatDynamoDBItem(item)}'`);
  }

  console.log('Test data setup complete!');
  console.log(`Created ${accounts.length} accounts and ${repositories.length} repositories`);
}

setupTestData().catch(console.error); 