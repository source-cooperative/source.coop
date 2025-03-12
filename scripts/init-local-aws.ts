import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { exampleAccounts } from "../src/fixtures/example-accounts";
import { exampleRepositories } from "../src/fixtures/example-data";

const client = new DynamoDBClient({
  endpoint: "http://localhost:8000",
  region: "local",
  credentials: {
    accessKeyId: "local",
    secretAccessKey: "local"
  }
});

const docClient = DynamoDBDocument.from(client);

async function initializeLocalDB() {
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
    if ((e as any).name === 'ResourceInUseException') {
      console.log("→ Accounts table already exists");
    } else {
      console.error("✗ Error creating Accounts table:", e);
    }
  }

  try {
    await client.send(new CreateTableCommand({
      TableName: "Repositories",
      AttributeDefinitions: [
        { AttributeName: "repository_id", AttributeType: "S" }
      ],
      KeySchema: [
        { AttributeName: "repository_id", KeyType: "HASH" }
      ],
      BillingMode: "PAY_PER_REQUEST"
    }));
    console.log("✓ Created Repositories table");
  } catch (e) {
    if ((e as any).name === 'ResourceInUseException') {
      console.log("→ Repositories table already exists");
    } else {
      console.error("✗ Error creating Repositories table:", e);
    }
  }

  // Load example data
  try {
    console.log("\nLoading example data...");
    
    for (const account of exampleAccounts) {
      await docClient.put({
        TableName: "Accounts",
        Item: account
      });
    }
    console.log("✓ Loaded example accounts");

    for (const repository of exampleRepositories) {
      await docClient.put({
        TableName: "Repositories",
        Item: repository
      });
    }
    console.log("✓ Loaded example repositories");
  } catch (e) {
    console.error("✗ Error loading example data:", e);
  }
}

initializeLocalDB(); 