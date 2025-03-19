import { DynamoDBClient, CreateTableCommand, DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { accounts, repositories } from '../src/fixtures/test-data';

const client = new DynamoDBClient({
  endpoint: "http://localhost:8000",
  region: "local",
  credentials: {
    accessKeyId: "local",
    secretAccessKey: "local"
  }
});

const docClient = DynamoDBDocument.from(client);

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

async function initializeLocalDB() {
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
        { AttributeName: "account_id", AttributeType: "S" }
      ],
      KeySchema: [
        { AttributeName: "account_id", KeyType: "HASH" }
      ],
      BillingMode: "PAY_PER_REQUEST"
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
        { AttributeName: "account_id", AttributeType: "S" }
      ],
      KeySchema: [
        { AttributeName: "repository_id", KeyType: "HASH" }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "account_id-index",
          KeySchema: [
            { AttributeName: "account_id", KeyType: "HASH" }
          ],
          Projection: {
            ProjectionType: "ALL"
          }
        }
      ],
      BillingMode: "PAY_PER_REQUEST"
    }));
    console.log("✓ Created Repositories table with account_id GSI");
  } catch (e) {
    console.error("✗ Error creating Repositories table:", e);
    throw e;
  }

  // Wait for tables to be fully created
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Load example data
  try {
    console.log("\nLoading example data...");
    
    for (const account of accounts) {
      await docClient.put({
        TableName: "Accounts",
        Item: account
      });
    }
    console.log("✓ Loaded example accounts");

    for (const repository of repositories) {
      await docClient.put({
        TableName: "Repositories",
        Item: {
          ...repository,
          account_id: repository.account.account_id // Add account_id field for GSI
        }
      });
    }
    console.log("✓ Loaded example repositories");
  } catch (e) {
    console.error("✗ Error loading example data:", e);
    throw e;
  }
}

initializeLocalDB().catch(console.error); 