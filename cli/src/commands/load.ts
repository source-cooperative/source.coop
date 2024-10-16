import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import {
  AccountSchema,
  APIKeySchema,
  DataConnectionSchema,
  MembershipSchema,
  RepositorySchema,
  Repository,
  APIKey,
  Account,
  DataConnection,
  Membership,
} from "@/api/types";
import { marshall } from "@aws-sdk/util-dynamodb";

async function loadJson(path: string) {
  const fileContent = await fs.promises.readFile(path, "utf-8");

  // Parse the JSON
  const jsonData = JSON.parse(fileContent);

  return jsonData;
}

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function batchInsertIntoDynamoDB(
  tableName: string,
  items: Repository[] | Account[] | Membership[] | APIKey[] | DataConnection[],
  production: boolean
): Promise<void> {
  // Create a DynamoDB client
  let client;
  if (!production) {
    client = new DynamoDBClient({ endpoint: "http://localhost:8000" });
  } else {
    client = new DynamoDBClient();
  }
  const docClient = DynamoDBDocumentClient.from(client);
  for (const item of items) {
    const params = {
      TableName: tableName,
      Item: item,
    };

    try {
      const command = new PutCommand(params);
      await docClient.send(command);
      // To avoid ProvisionedThroughputExceededException, sleep for 40ms between each write
      if (production) {
        await sleep(40);
      }
    } catch (error) {
      console.error(`Error inserting item into ${tableName}:`, error);
      throw error;
    }
  }

  console.log("All items inserted successfully");
}

export async function load(loadDirectory: string, production: boolean) {
  console.log(`Loading data from ${loadDirectory}`);
  const repositories = await loadJson(
    path.join(loadDirectory, "table", "sc-repositories.json")
  );
  const accounts = await loadJson(
    path.join(loadDirectory, "table", "sc-accounts.json")
  );
  const apiKeys = await loadJson(
    path.join(loadDirectory, "table", "sc-api-keys.json")
  );
  const memberships = await loadJson(
    path.join(loadDirectory, "table", "sc-memberships.json")
  );
  const dataConnections = await loadJson(
    path.join(loadDirectory, "table", "sc-data-connections.json")
  );

  console.log(`Repository Count: ${repositories.length}`);
  console.log(`Account Count: ${accounts.length}`);
  console.log(`Membership Count: ${memberships.length}`);
  console.log(`API Key Count: ${apiKeys.length}`);
  console.log(`Data Connection Count: ${dataConnections.length}`);

  console.log("Inserting data into sc-accounts...");
  await batchInsertIntoDynamoDB("sc-accounts", accounts, production);

  console.log("Inserting data into sc-repositories...");
  await batchInsertIntoDynamoDB("sc-repositories", repositories, production);

  console.log("Inserting data into sc-api-keys...");
  await batchInsertIntoDynamoDB("sc-api-keys", apiKeys, production);

  console.log("Inserting data into sc-memberships...");
  await batchInsertIntoDynamoDB("sc-memberships", memberships, production);

  console.log("Inserting data into sc-data-connections...");
  await batchInsertIntoDynamoDB(
    "sc-data-connections",
    dataConnections,
    production
  );

  console.log("Done!");
}
