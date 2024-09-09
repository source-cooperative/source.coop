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

async function loadAndValidateJson<T extends z.ZodType>(
  path: string,
  schema: T
): Promise<z.infer<T>> {
  try {
    // Read the file
    const fileContent = await fs.promises.readFile(path, "utf-8");

    // Parse the JSON
    const jsonData = JSON.parse(fileContent);

    // Validate against the schema
    const validatedData = schema.parse(jsonData);

    return validatedData;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // If it's a Zod validation error, throw a custom error with path and Zod error message
      throw new Error(`Validation error for file ${path}: ${error.message}`);
    } else if (error instanceof SyntaxError) {
      // If it's a JSON parsing error
      throw new Error(`Invalid JSON in file ${path}: ${error.message}`);
    } else if (error instanceof Error) {
      // For other types of errors (e.g., file not found)
      throw new Error(`Error processing file ${path}: ${error.message}`);
    } else {
      // For unknown error types
      throw new Error(`Unknown error occurred while processing file ${path}`);
    }
  }
}

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

async function batchInsertIntoDynamoDB(
  tableName: string,
  items: Repository[] | Account[] | Membership[] | APIKey[] | DataConnection[]
): Promise<void> {
  // Create a DynamoDB client
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  for (const item of items) {
    const params = {
      TableName: tableName,
      Item: item,
    };

    try {
      const command = new PutCommand(params);
      await docClient.send(command);
    } catch (error) {
      console.error("Error inserting item:", error);
      throw error;
    }
  }

  console.log("All items inserted successfully");
}

export async function load(loadDirectory: string) {
  console.log(`Loading data from ${loadDirectory}`);
  const repositories: Repository[] = await loadAndValidateJson(
    path.join(loadDirectory, "table", "repositories.json"),
    z.array(RepositorySchema)
  );
  const accounts: Account[] = await loadAndValidateJson(
    path.join(loadDirectory, "table", "accounts.json"),
    z.array(AccountSchema)
  );
  const apiKeys: APIKey[] = await loadAndValidateJson(
    path.join(loadDirectory, "table", "api-keys.json"),
    z.array(APIKeySchema)
  );
  const memberships: Membership[] = await loadAndValidateJson(
    path.join(loadDirectory, "table", "memberships.json"),
    z.array(MembershipSchema)
  );
  const dataConnections: DataConnection[] = await loadAndValidateJson(
    path.join(loadDirectory, "table", "data-connections.json"),
    z.array(DataConnectionSchema)
  );

  console.log(`Repository Count: ${repositories.length}`);
  console.log(`Account Count: ${accounts.length}`);
  console.log(`Membership Count: ${memberships.length}`);
  console.log(`API Key Count: ${apiKeys.length}`);
  console.log(`Data Connection Count: ${dataConnections.length}`);

  batchInsertIntoDynamoDB("source-cooperative-accounts", accounts);
  batchInsertIntoDynamoDB("source-cooperative-repositories", repositories);
  batchInsertIntoDynamoDB("source-cooperative-api-keys", apiKeys);
  batchInsertIntoDynamoDB("source-cooperative-memberships", memberships);
  batchInsertIntoDynamoDB(
    "source-cooperative-data-connections",
    dataConnections
  );
}