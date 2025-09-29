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

// Import mock data
import { accounts, apiKeys, memberships, products, dataConnections } from "../src/lib/api/utils.mock";

const DYNAMODB_ENDPOINT =
  process.env.DYNAMODB_ENDPOINT || "http://localhost:8000";
const RESET_TABLES = Boolean(process.env.RESET_TABLES);
const STAGE = "local";

// Helper function to generate table names
function getTableName(model: string): string {
  return `sc-${STAGE}-${model}`;
}

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
    tables.TableNames?.includes(getTableName("accounts")) &&
    tables.TableNames?.includes(getTableName("products")) &&
    tables.TableNames?.includes(getTableName("api-keys")) &&
    tables.TableNames?.includes(getTableName("data-connections")) &&
    tables.TableNames?.includes(getTableName("memberships"))
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
  await deleteTable(getTableName("products"));
  await deleteTable(getTableName("accounts"));
  await deleteTable(getTableName("api-keys"));
  await deleteTable(getTableName("data-connections"));
  await deleteTable(getTableName("memberships"));

  // Wait for tables to be fully deleted
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Create accounts table
  try {
    await client.send(
      new CreateTableCommand({
        TableName: getTableName("accounts"),
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
    console.log(`✓ Created ${getTableName("accounts")} table`);
  } catch (e) {
    console.error(`✗ Error creating ${getTableName("accounts")} table:`, e);
    throw e;
  }

  // Create api-keys table
  try {
    await client.send(
      new CreateTableCommand({
        TableName: getTableName("api-keys"),
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
    console.log(`✓ Created ${getTableName("api-keys")} table`);
  } catch (e) {
    console.error(`✗ Error creating ${getTableName("api-keys")} table:`, e);
    throw e;
  }

  // Create data-connections table
  try {
    await client.send(
      new CreateTableCommand({
        TableName: getTableName("data-connections"),
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
    console.log(`✓ Created ${getTableName("data-connections")} table`);
  } catch (e) {
    console.error(
      `✗ Error creating ${getTableName("data-connections")} table:`,
      e
    );
    throw e;
  }

  // Create memberships table
  try {
    await client.send(
      new CreateTableCommand({
        TableName: getTableName("memberships"),
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
    console.log(`✓ Created ${getTableName("memberships")} table`);
  } catch (e) {
    console.error(`✗ Error creating ${getTableName("memberships")} table:`, e);
    throw e;
  }

  // Create products table
  try {
    await client.send(
      new CreateTableCommand({
        TableName: getTableName("products"),
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
    console.log(`✓ Created ${getTableName("products")} table`);
  } catch (e) {
    console.error(`✗ Error creating ${getTableName("products")} table:`, e);
    throw e;
  }

  // Wait for tables to be fully created
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

async function loadFixtureData() {
  console.log("Loading fixture data into DynamoDB tables...");

  try {
    console.log(`Loaded ${accounts.length} accounts from mock utilities`);
    console.log(`Loaded ${products.length} products from mock utilities`);
    console.log(`Loaded ${apiKeys.length} API keys from mock utilities`);
    console.log(`Loaded ${memberships.length} memberships from mock utilities`);
    console.log(
      `Loaded ${dataConnections.length} data connections from mock utilities`
    );

    // Insert accounts into DynamoDB
    console.log(
      `Inserting ${accounts.length} accounts into ${getTableName(
        "accounts"
      )} table...`
    );
    let processedAccounts = 0;

    for (const account of accounts) {
      try {
        await docClient.send(
          new PutCommand({
            TableName: getTableName("accounts"),
            Item: account,
          })
        );

        processedAccounts++;
        if (processedAccounts % 100 === 0) {
          console.log(
            `Processed ${processedAccounts}/${accounts.length} accounts...`
          );
        }
      } catch (error) {
        console.error(`Error inserting account ${account.account_id}:`, error);
      }
    }
    console.log(
      `Account insertion complete! Processed ${processedAccounts} accounts.`
    );

    // Insert API keys into DynamoDB
    console.log(
      `Inserting ${apiKeys.length} API keys into ${getTableName(
        "api-keys"
      )} table...`
    );
    let processedApiKeys = 0;

    for (const apiKey of apiKeys) {
      try {
        await docClient.send(
          new PutCommand({
            TableName: getTableName("api-keys"),
            Item: apiKey,
          })
        );

        processedApiKeys++;
        if (processedApiKeys % 50 === 0) {
          console.log(
            `Processed ${processedApiKeys}/${apiKeys.length} API keys...`
          );
        }
      } catch (error) {
        console.error(
          `Error inserting API key ${apiKey.access_key_id}:`,
          error
        );
      }
    }
    console.log(
      `API key insertion complete! Processed ${processedApiKeys} API keys.`
    );

    // Insert data connections into DynamoDB
    console.log(
      `Inserting ${dataConnections.length} data connections into ${getTableName(
        "data-connections"
      )} table...`
    );
    let processedDataConnections = 0;

    for (const dataConnection of dataConnections) {
      try {
        await docClient.send(
          new PutCommand({
            TableName: getTableName("data-connections"),
            Item: dataConnection,
          })
        );

        processedDataConnections++;
        if (processedDataConnections % 50 === 0) {
          console.log(
            `Processed ${processedDataConnections}/${dataConnections.length} data connections...`
          );
        }
      } catch (error) {
        console.error(
          `Error inserting data connection ${dataConnection.data_connection_id}:`,
          error
        );
      }
    }
    console.log(
      `Data connection insertion complete! Processed ${processedDataConnections} data connections.`
    );

    // Insert memberships into DynamoDB
    console.log(
      `Inserting ${memberships.length} memberships into ${getTableName(
        "memberships"
      )} table...`
    );
    let processedMemberships = 0;

    for (const membership of memberships) {
      try {
        await docClient.send(
          new PutCommand({
            TableName: getTableName("memberships"),
            Item: membership,
          })
        );

        processedMemberships++;
        if (processedMemberships % 50 === 0) {
          console.log(
            `Processed ${processedMemberships}/${memberships.length} memberships...`
          );
        }
      } catch (error) {
        console.error(
          `Error inserting membership ${membership.membership_id}:`,
          error
        );
      }
    }
    console.log(
      `Membership insertion complete! Processed ${processedMemberships} memberships.`
    );

    // Insert products into DynamoDB
    console.log(
      `Inserting ${products.length} products into ${getTableName(
        "products"
      )} table...`
    );
    let processedProducts = 0;

    for (const product of products) {
      try {
        await docClient.send(
          new PutCommand({
            TableName: getTableName("products"),
            Item: product,
          })
        );

        processedProducts++;
        if (processedProducts % 50 === 0) {
          console.log(
            `Processed ${processedProducts}/${products.length} products...`
          );
        }
      } catch (error) {
        console.error(`Error inserting product ${product.product_id}:`, error);
      }
    }
    console.log(
      `Product insertion complete! Processed ${processedProducts} products.`
    );

    // Verify the data was saved
    console.log("\nVerifying saved data...");
    try {
      const { Items: savedProducts, Count: productCount } =
        await docClient.send(
          new QueryCommand({
            TableName: getTableName("products"),
            IndexName: "public_featured",
            KeyConditionExpression: "visibility = :visibility",
            ExpressionAttributeValues: {
              ":visibility": "public",
            },
          })
        );
      console.log(`Found ${productCount || 0} public products in DynamoDB`);

      const { Items: savedAccounts, Count: accountCount } =
        await docClient.send(
          new QueryCommand({
            TableName: getTableName("accounts"),
            IndexName: "account_type",
            KeyConditionExpression: "#type = :type",
            ExpressionAttributeNames: {
              "#type": "type",
            },
            ExpressionAttributeValues: {
              ":type": "individual",
            },
          })
        );
      console.log(`Found ${accountCount || 0} individual accounts in DynamoDB`);

      const { Items: savedApiKeys, Count: apiKeyCount } = await docClient.send(
        new QueryCommand({
          TableName: getTableName("api-keys"),
          IndexName: "account_id",
          KeyConditionExpression: "account_id = :account_id",
          ExpressionAttributeValues: {
            ":account_id": "regular-user",
          },
        })
      );
      console.log(
        `Found ${apiKeyCount || 0} API keys for regular-user in DynamoDB`
      );

      const { Items: savedMemberships, Count: membershipCount } =
        await docClient.send(
          new QueryCommand({
            TableName: getTableName("memberships"),
            IndexName: "account_id",
            KeyConditionExpression: "account_id = :account_id",
            ExpressionAttributeValues: {
              ":account_id": "organization-owner-user",
            },
          })
        );
      console.log(
        `Found ${
          membershipCount || 0
        } memberships for organization-owner-user in DynamoDB`
      );
    } catch (error) {
      console.error("Error verifying saved data:", error);
    }
  } catch (error) {
    console.error("Error loading fixture data:", error);
  }
}

async function main() {
  try {
    if ((await tablesExist()) && !RESET_TABLES) {
      console.log(
        "✅ Tables already exist and RESET_TABLES environment variable is not set, skipping initialization..."
      );
      return;
    }

    console.log("Initializing local development environment...");

    // Create DynamoDB tables
    await createTables();

    // Load fixture data
    await loadFixtureData();

    console.log("\n🚀 Local development environment setup complete!");
  } catch (error) {
    console.error("❌ Error setting up local environment:", error);
    process.exit(1);
  }
}

main(); 