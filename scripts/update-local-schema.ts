import { DynamoDBClient, CreateTableCommand, DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const client = new DynamoDBClient({
  endpoint: "http://localhost:8000",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID || "local",
    secretAccessKey: process.env.DYNAMODB_SECRET_ACCESS_KEY || "local"
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
  await deleteTable("sc-accounts");
  await deleteTable("sc-products");
  
  // Wait for tables to be fully deleted
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Create Accounts table
  try {
    await client.send(new CreateTableCommand({
      TableName: "sc-accounts",
      KeySchema: [
        { AttributeName: "account_id", KeyType: "HASH" },
        { AttributeName: "type", KeyType: "RANGE" }
      ],
      AttributeDefinitions: [
        { AttributeName: "account_id", AttributeType: "S" },
        { AttributeName: "type", AttributeType: "S" },
        { AttributeName: "emails", AttributeType: "S" }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "AccountTypeIndex",
          KeySchema: [
            { AttributeName: "type", KeyType: "HASH" },
            { AttributeName: "account_id", KeyType: "RANGE" }
          ],
          Projection: { ProjectionType: "ALL" },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        },
        {
          IndexName: "AccountEmailIndex",
          KeySchema: [
            { AttributeName: "emails", KeyType: "HASH" },
            { AttributeName: "account_id", KeyType: "RANGE" }
          ],
          Projection: { ProjectionType: "ALL" },
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
  }

  // Create Products table
  try {
    await client.send(new CreateTableCommand({
      TableName: "sc-products",
      KeySchema: [
        { AttributeName: "product_id", KeyType: "HASH" },
        { AttributeName: "account_id", KeyType: "RANGE" }
      ],
      AttributeDefinitions: [
        { AttributeName: "product_id", AttributeType: "S" },
        { AttributeName: "account_id", AttributeType: "S" },
        { AttributeName: "visibility", AttributeType: "S" },
        { AttributeName: "created_at", AttributeType: "S" }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "AccountProductsIndex",
          KeySchema: [
            { AttributeName: "account_id", KeyType: "HASH" },
            { AttributeName: "created_at", KeyType: "RANGE" }
          ],
          Projection: { ProjectionType: "ALL" },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        },
        {
          IndexName: "PublicProductsIndex",
          KeySchema: [
            { AttributeName: "visibility", KeyType: "HASH" },
            { AttributeName: "created_at", KeyType: "RANGE" }
          ],
          Projection: { ProjectionType: "ALL" },
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
    console.log("✓ Created sc-products table");
  } catch (e) {
    console.error("✗ Error creating sc-products table:", e);
  }
}

async function main() {
  try {
    await createTables();
    console.log("✓ Schema update complete");
  } catch (e) {
    console.error("✗ Error updating schema:", e);
    process.exit(1);
  }
}

main(); 