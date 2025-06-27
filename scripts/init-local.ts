// AWS SDK imports
import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

// Node.js built-in imports
import { readFileSync } from "fs";
import { join } from "path";

// Import types
import type { Product } from "../src/types/product_v2.js";
import type { Account } from "../src/types/account_v2.js";

const DYNAMODB_ENDPOINT =
  process.env.DYNAMODB_ENDPOINT || "http://localhost:8000";
const RESET_TABLES = Boolean(process.env.RESET_TABLES);

// Configure DynamoDB client
const client = new DynamoDBClient({
  region: "local",
  endpoint: DYNAMODB_ENDPOINT,
  credentials: {
    accessKeyId: "local",
    secretAccessKey: "local",
  },
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

async function tablesExist() {
  const tables = await client.send(new ListTablesCommand({}));
  return (
    tables.TableNames?.includes("sc-accounts") &&
    tables.TableNames?.includes("sc-products")
  );
}

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
  await deleteTable("sc-products");
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
      TableName: "sc-products",
      AttributeDefinitions: [
        { AttributeName: "product_id", AttributeType: "S" },
        { AttributeName: "account_id", AttributeType: "S" },
        { AttributeName: "created_at", AttributeType: "S" },
        { AttributeName: "visibility", AttributeType: "S" }
      ],
      KeySchema: [
        { AttributeName: "product_id", KeyType: "HASH" },
        { AttributeName: "account_id", KeyType: "RANGE" }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "AccountProductsIndex",
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
          IndexName: "PublicProductsIndex",
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
    console.log("✓ Created sc-products table");
  } catch (e) {
    console.error("✗ Error creating sc-products table:", e);
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
    const productsPath = join(process.cwd(), 'scripts', 'converted-data', 'products.json');
    
    console.log(`Reading accounts from ${accountsPath}`);
    const accounts: Account[] = JSON.parse(readFileSync(accountsPath, 'utf8'));
    
    console.log(`Reading products from ${productsPath}`);
    const products: Product[] = JSON.parse(readFileSync(productsPath, 'utf8'));
    
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
    
    // Insert products into DynamoDB
    console.log(`Inserting ${products.length} products into sc-products table...`);
    let processedProducts = 0;
    
    for (const product of products) {
      try {
        await docClient.send(new PutCommand({
          TableName: 'sc-products',
          Item: product
        }));
        
        processedProducts++;
        if (processedProducts % 50 === 0) {
          console.log(`Processed ${processedProducts}/${products.length} products...`);
        }
      } catch (error) {
        console.error(`Error inserting product ${product.product_id}:`, error);
      }
    }
    console.log(`Product insertion complete! Processed ${processedProducts} products.`);

    // Verify the data was saved
    console.log('\nVerifying saved data...');
    try {
      const { Items: savedProducts, Count: productCount } = await docClient.send(new QueryCommand({
        TableName: 'sc-products',
        IndexName: 'PublicProductsIndex',
        KeyConditionExpression: 'visibility = :visibility',
        ExpressionAttributeValues: {
          ':visibility': 'public'
        }
      }));
      console.log(`Found ${productCount || 0} public products in DynamoDB`);
      
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
    if (await tablesExist() && !RESET_TABLES) {
      console.log(
        "✅ Tables already exist and RESET_TABLES environment variable is not set, skipping initialization..."
      );
      return;
    }

    console.log("Initializing local development environment...");

    // Create DynamoDB tables
    await createTables();

    // Load converted data
    await loadConvertedData();

    console.log("\n🚀 Local development environment setup complete!");
  } catch (error) {
    console.error('❌ Error setting up local environment:', error);
    process.exit(1);
  }
}

main(); 