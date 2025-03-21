import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import fs from 'fs';
import path from 'path';
import type { Account, Repository } from '@/types';

const client = new DynamoDBClient({
  endpoint: "http://localhost:8000",
  region: "local",
  credentials: {
    accessKeyId: "local",
    secretAccessKey: "local"
  }
});

const docClient = DynamoDBDocument.from(client);

// Helper to generate a fake Ory ID
function generateFakeOryId(): string {
  return `ory_${Math.random().toString(36).substring(2, 15)}`;
}

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
      name: accountId.charAt(0).toUpperCase() + accountId.slice(1).replace(/-/g, ' '),
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
    await docClient.put({
      TableName: "Accounts",
      Item: account
    });
  }

  console.log('Writing repositories to DynamoDB...');
  for (const repository of repositories) {
    await docClient.put({
      TableName: "Repositories",
      Item: repository
    });
  }

  console.log('Test data setup complete!');
  console.log(`Created ${accounts.length} accounts and ${repositories.length} repositories`);
}

// Run the setup
setupTestData().catch(console.error); 