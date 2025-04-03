// AWS SDK imports
import { DynamoDBClient, CreateTableCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

// Node.js built-in imports
import { readFileSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

// Import types
import type { Repository_v2, RepositoryMirror, RepositoryRole } from '../src/types/repository_v2.js';
import type { Account, IndividualAccount, OrganizationalAccount } from '../src/types/account_v2.js';

const execAsync = promisify(exec);

// Configure DynamoDB client
const client = new DynamoDBClient({
  region: 'local',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local'
  }
});

const docClient = DynamoDBDocumentClient.from(client, {
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
  await deleteTable("sc-repositories");
  await deleteTable("sc-accounts");
  
  // Wait for tables to be fully deleted
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Create tables
  try {
    await client.send(new CreateTableCommand({
      TableName: "sc-accounts",
      AttributeDefinitions: [
        { AttributeName: "account_id", AttributeType: "S" },
        { AttributeName: "type", AttributeType: "S" }
      ],
      KeySchema: [
        { AttributeName: "account_id", KeyType: "HASH" },
        { AttributeName: "type", KeyType: "RANGE" }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "AccountTypeIndex",
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
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }));
    console.log("✓ Created sc-accounts table");
  } catch (e) {
    console.error("✗ Error creating sc-accounts table:", e);
    throw e;
  }

  try {
    await client.send(new CreateTableCommand({
      TableName: "sc-repositories",
      AttributeDefinitions: [
        { AttributeName: "repository_id", AttributeType: "S" },
        { AttributeName: "account_id", AttributeType: "S" },
        { AttributeName: "created_at", AttributeType: "S" },
        { AttributeName: "visibility", AttributeType: "S" }
      ],
      KeySchema: [
        { AttributeName: "repository_id", KeyType: "HASH" },
        { AttributeName: "account_id", KeyType: "RANGE" }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "AccountRepositoriesIndex",
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
        },
        {
          IndexName: "PublicRepositoriesIndex",
          KeySchema: [
            { AttributeName: "visibility", KeyType: "HASH" },
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
    console.log("✓ Created sc-repositories table");
  } catch (e) {
    console.error("✗ Error creating sc-repositories table:", e);
    throw e;
  }

  // Wait for tables to be fully created
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function loadConvertedData() {
  console.log('Loading converted data into DynamoDB tables...');

  try {
    // Read the converted data files
    const accountsPath = join(process.cwd(), 'scripts', 'converted-data', 'accounts.json');
    const reposPath = join(process.cwd(), 'scripts', 'converted-data', 'repositories.json');
    
    console.log(`Reading accounts from ${accountsPath}`);
    const accounts: Account[] = JSON.parse(readFileSync(accountsPath, 'utf8'));
    
    console.log(`Reading repositories from ${reposPath}`);
    const repositories: Repository_v2[] = JSON.parse(readFileSync(reposPath, 'utf8'));
    
    // Insert accounts into DynamoDB
    console.log(`Inserting ${accounts.length} accounts into sc-accounts table...`);
    let processedAccounts = 0;
    
    for (const account of accounts) {
      try {
        await docClient.send(new PutCommand({
          TableName: 'sc-accounts',
          Item: account
        }));
        
        processedAccounts++;
        if (processedAccounts % 100 === 0) {
          console.log(`Processed ${processedAccounts}/${accounts.length} accounts...`);
        }
      } catch (error) {
        console.error(`Error inserting account ${account.account_id}:`, error);
      }
    }
    console.log(`Account insertion complete! Processed ${processedAccounts} accounts.`);
    
    // Insert repositories into DynamoDB
    console.log(`Inserting ${repositories.length} repositories into sc-repositories table...`);
    let processedRepos = 0;
    
    for (const repo of repositories) {
      try {
        await docClient.send(new PutCommand({
          TableName: 'sc-repositories',
          Item: repo
        }));
        
        processedRepos++;
        if (processedRepos % 50 === 0) {
          console.log(`Processed ${processedRepos}/${repositories.length} repositories...`);
        }
      } catch (error) {
        console.error(`Error inserting repository ${repo.repository_id}:`, error);
      }
    }
    console.log(`Repository insertion complete! Processed ${processedRepos} repositories.`);

    // Verify the data was saved
    console.log('\nVerifying saved data...');
    try {
      const { Items: savedRepos, Count: repoCount } = await docClient.send(new QueryCommand({
        TableName: 'sc-repositories',
        IndexName: 'PublicRepositoriesIndex',
        KeyConditionExpression: 'visibility = :visibility',
        ExpressionAttributeValues: {
          ':visibility': 'public'
        }
      }));
      console.log(`Found ${repoCount || 0} public repositories in DynamoDB`);
      
      const { Items: savedAccounts, Count: accountCount } = await docClient.send(new QueryCommand({
        TableName: 'sc-accounts',
        IndexName: 'AccountTypeIndex',
        KeyConditionExpression: "#type = :type",
        ExpressionAttributeNames: {
          "#type": "type" 
        },
        ExpressionAttributeValues: {
          ':type': 'individual'
        }
      }));
      console.log(`Found ${accountCount || 0} individual accounts in DynamoDB`);
    } catch (error) {
      console.error('Error verifying saved data:', error);
    }
  } catch (error) {
    console.error('Error loading converted data:', error);
  }
}

async function main() {
  try {
    console.log('Initializing local development environment...');
    
    // Create DynamoDB tables
    await createTables();
    
    // Load converted data
    await loadConvertedData();
    
    console.log('\nLocal development environment setup complete!');
  } catch (error) {
    console.error('Error setting up local environment:', error);
    process.exit(1);
  }
}

main(); 