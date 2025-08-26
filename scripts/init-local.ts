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
import type { Account } from "../src/types/account.js";

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
    tables.TableNames?.includes("sc-local-accounts") &&
    tables.TableNames?.includes("sc-local-products") &&
    tables.TableNames?.includes("sc-local-api-keys") &&
    tables.TableNames?.includes("sc-local-data-connections") &&
    tables.TableNames?.includes("sc-local-memberships")
  );
}

async function deleteTable(tableName: string) {
  try {
    await client.send(
      new DeleteTableCommand({
        TableName: tableName,
      })
    );
    console.log(`✓ Deleted ${tableName} table`);
  } catch (e) {
    if ((e as any).name === "ResourceNotFoundException") {
      console.log(`→ ${tableName} table does not exist`);
    } else {
      console.error(`✗ Error deleting ${tableName} table:`, e);
    }
  }
}

async function createTables() {
  // Delete existing tables
  await deleteTable("sc-local-accounts");
  await deleteTable("sc-local-products");
  await deleteTable("sc-local-api-keys");
  await deleteTable("sc-local-data-connections");
  await deleteTable("sc-local-memberships");

  // Wait for tables to be fully deleted
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Create sc-local-accounts table
  try {
    await client.send(
      new CreateTableCommand({
        TableName: "sc-local-accounts",
        AttributeDefinitions: [
          { AttributeName: "account_id", AttributeType: "S" },
          { AttributeName: "type", AttributeType: "S" },
          { AttributeName: "identity_id", AttributeType: "S" },
        ],
        KeySchema: [{ AttributeName: "account_id", KeyType: "HASH" }],
        GlobalSecondaryIndexes: [
          {
            IndexName: "account_type",
            KeySchema: [
              { AttributeName: "type", KeyType: "HASH" },
              { AttributeName: "account_id", KeyType: "RANGE" },
            ],
            Projection: {
              ProjectionType: "ALL",
            },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5,
            },
          },
          {
            IndexName: "identity_id",
            KeySchema: [{ AttributeName: "identity_id", KeyType: "HASH" }],
            Projection: {
              ProjectionType: "ALL",
            },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5,
            },
          },
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      })
    );
    console.log("✓ Created sc-local-accounts table");
  } catch (e) {
    console.error("✗ Error creating sc-local-accounts table:", e);
    throw e;
  }

  // Create sc-local-api-keys table
  try {
    await client.send(
      new CreateTableCommand({
        TableName: "sc-local-api-keys",
        AttributeDefinitions: [
          { AttributeName: "access_key_id", AttributeType: "S" },
          { AttributeName: "account_id", AttributeType: "S" },
        ],
        KeySchema: [{ AttributeName: "access_key_id", KeyType: "HASH" }],
        GlobalSecondaryIndexes: [
          {
            IndexName: "account_id",
            KeySchema: [{ AttributeName: "account_id", KeyType: "HASH" }],
            Projection: {
              ProjectionType: "ALL",
            },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5,
            },
          },
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      })
    );
    console.log("✓ Created sc-local-api-keys table");
  } catch (e) {
    console.error("✗ Error creating sc-local-api-keys table:", e);
    throw e;
  }

  // Create sc-local-data-connections table
  try {
    await client.send(
      new CreateTableCommand({
        TableName: "sc-local-data-connections",
        AttributeDefinitions: [
          { AttributeName: "data_connection_id", AttributeType: "S" },
        ],
        KeySchema: [{ AttributeName: "data_connection_id", KeyType: "HASH" }],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      })
    );
    console.log("✓ Created sc-local-data-connections table");
  } catch (e) {
    console.error("✗ Error creating sc-local-data-connections table:", e);
    throw e;
  }

  // Create sc-local-memberships table
  try {
    await client.send(
      new CreateTableCommand({
        TableName: "sc-local-memberships",
        AttributeDefinitions: [
          { AttributeName: "membership_id", AttributeType: "S" },
          { AttributeName: "account_id", AttributeType: "S" },
          { AttributeName: "membership_account_id", AttributeType: "S" },
          { AttributeName: "repository_id", AttributeType: "S" },
        ],
        KeySchema: [{ AttributeName: "membership_id", KeyType: "HASH" }],
        GlobalSecondaryIndexes: [
          {
            IndexName: "account_id",
            KeySchema: [{ AttributeName: "account_id", KeyType: "HASH" }],
            Projection: {
              ProjectionType: "ALL",
            },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5,
            },
          },
          {
            IndexName: "membership_account_id_repository_id",
            KeySchema: [
              { AttributeName: "membership_account_id", KeyType: "HASH" },
              { AttributeName: "repository_id", KeyType: "RANGE" },
            ],
            Projection: {
              ProjectionType: "ALL",
            },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5,
            },
          },
          {
            IndexName: "membership_account_id",
            KeySchema: [
              { AttributeName: "membership_account_id", KeyType: "HASH" },
            ],
            Projection: {
              ProjectionType: "ALL",
            },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5,
            },
          },
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      })
    );
    console.log("✓ Created sc-local-memberships table");
  } catch (e) {
    console.error("✗ Error creating sc-local-memberships table:", e);
    throw e;
  }

  // Create sc-local-products table
  try {
    await client.send(
      new CreateTableCommand({
        TableName: "sc-local-products",
        AttributeDefinitions: [
          { AttributeName: "account_id", AttributeType: "S" },
          { AttributeName: "product_id", AttributeType: "S" },
          { AttributeName: "visibility", AttributeType: "S" },
          { AttributeName: "featured", AttributeType: "N" },
        ],
        KeySchema: [
          { AttributeName: "account_id", KeyType: "HASH" },
          { AttributeName: "product_id", KeyType: "RANGE" },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: "public_featured",
            KeySchema: [
              { AttributeName: "visibility", KeyType: "HASH" },
              { AttributeName: "featured", KeyType: "RANGE" },
            ],
            Projection: {
              ProjectionType: "ALL",
            },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5,
            },
          },
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      })
    );
    console.log("✓ Created sc-local-products table");
  } catch (e) {
    console.error("✗ Error creating sc-local-products table:", e);
    throw e;
  }

  // Wait for tables to be fully created
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

async function loadConvertedData() {
  console.log('Loading converted data into DynamoDB tables...');

  try {
    // Read the converted data files
    const accountsPath = join(process.cwd(), 'scripts', 'converted-data', 'accounts.json');
    const productsPath = join(process.cwd(), 'scripts', 'converted-data', 'products.json');
    
    console.log(`Reading accounts from ${accountsPath}`);
    const accounts: Account[] = JSON.parse(readFileSync(accountsPath, "utf8"));
    
    console.log(`Reading products from ${productsPath}`);
    const products: Product[] = JSON.parse(readFileSync(productsPath, 'utf8'));
    
    // Insert accounts into DynamoDB
    console.log(
      `Inserting ${accounts.length} accounts into sc-local-accounts table...`
    );
    let processedAccounts = 0;
    
    for (const account of accounts) {
      try {
        await docClient.send(
          new PutCommand({
            TableName: "sc-local-accounts",
            Item: account,
          })
        );
        
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
    console.log(
      `Inserting ${products.length} products into sc-local-products table...`
    );
    let processedProducts = 0;
    
    for (const product of products) {
      try {
        // Ensure the product has the required fields for the new table structure
        const productItem = {
          ...product,
          // Ensure account_id and product_id are present for the composite key
          account_id: product.account_id || 'unknown',
          product_id: product.product_id || 'unknown',
          // Set default values for indexed fields if they don't exist
          visibility: product.visibility || 'private',
          featured: product.featured || 0
        };
        
        await docClient.send(
          new PutCommand({
            TableName: "sc-local-products",
            Item: productItem,
          })
        );
        
        processedProducts++;
        if (processedProducts % 50 === 0) {
          console.log(`Processed ${processedProducts}/${products.length} products...`);
        }
      } catch (error) {
        console.error(`Error inserting product ${product.product_id}:`, error);
      }
    }
    console.log(`Product insertion complete! Processed ${processedProducts} products.`);

    // Load sample data for new tables
    console.log('Loading sample data for new tables...');
    
    // Load sample API keys
    try {
      const sampleApiKey = {
        access_key_id: 'sample-key-123',
        account_id: 'sample-account',
        name: 'Sample API Key',
        created_at: new Date().toISOString(),
        permissions: ['read']
      };
      
      await docClient.send(
        new PutCommand({
          TableName: "sc-local-api-keys",
          Item: sampleApiKey,
        })
      );
      console.log('✓ Loaded sample API key');
    } catch (error) {
      console.error('Error loading sample API key:', error);
    }

    // Load sample data connection
    try {
      const sampleDataConnection = {
        data_connection_id: 'sample-connection-123',
        account_id: 'sample-account',
        name: 'Sample Data Connection',
        type: 's3',
        created_at: new Date().toISOString()
      };
      
      await docClient.send(
        new PutCommand({
          TableName: "sc-local-data-connections",
          Item: sampleDataConnection,
        })
      );
      console.log('✓ Loaded sample data connection');
    } catch (error) {
      console.error('Error loading sample data connection:', error);
    }

    // Load sample membership
    try {
      const sampleMembership = {
        membership_id: 'sample-membership-123',
        account_id: 'sample-account',
        membership_account_id: 'sample-account',
        repository_id: 'sample-repo',
        role: 'member',
        created_at: new Date().toISOString()
      };
      
      await docClient.send(
        new PutCommand({
          TableName: "sc-local-memberships",
          Item: sampleMembership,
        })
      );
      console.log('✓ Loaded sample membership');
    } catch (error) {
      console.error('Error loading sample membership:', error);
    }

    // Verify the data was saved
    console.log('\nVerifying saved data...');
    try {
      const { Items: savedProducts, Count: productCount } = await docClient.send(new QueryCommand({
        TableName: 'sc-products',
        IndexName: 'public_featured',
        KeyConditionExpression: 'visibility = :visibility',
        ExpressionAttributeValues: {
          ':visibility': 'public'
        }
      }));
      console.log(`Found ${productCount || 0} public products in DynamoDB`);
      
      const { Items: savedAccounts, Count: accountCount } = await docClient.send(new QueryCommand({
        TableName: 'sc-accounts',
        IndexName: 'account_type',
        KeyConditionExpression: "#type = :type",
        ExpressionAttributeNames: {
          "#type": "type" 
        },
        ExpressionAttributeValues: {
          ':type': 'individual'
        }
      }));
      console.log(`Found ${accountCount || 0} individual accounts in DynamoDB`);
      
      // Verify new tables
      const { Count: apiKeyCount } = await docClient.send(new QueryCommand({
        TableName: 'sc-api-keys',
        IndexName: 'account_id',
        KeyConditionExpression: 'account_id = :account_id',
        ExpressionAttributeValues: {
          ':account_id': 'sample-account'
        }
      }));
      console.log(`Found ${apiKeyCount || 0} API keys in DynamoDB`);
      
      const { Count: dataConnectionCount } = await docClient.send(new QueryCommand({
        TableName: 'sc-data-connections',
        KeyConditionExpression: 'data_connection_id = :data_connection_id',
        ExpressionAttributeValues: {
          ':data_connection_id': 'sample-connection-123'
        }
      }));
      console.log(`Found ${dataConnectionCount || 0} data connections in DynamoDB`);
      
      const { Count: membershipCount } = await docClient.send(new QueryCommand({
        TableName: 'sc-memberships',
        IndexName: 'account_id',
        KeyConditionExpression: 'account_id = :account_id',
        ExpressionAttributeValues: {
          ':account_id': 'sample-account'
        }
      }));
      console.log(`Found ${membershipCount || 0} memberships in DynamoDB`);
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