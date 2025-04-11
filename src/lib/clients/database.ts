import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { CONFIG } from "../config";

// Singleton instances
let dynamoDb: DynamoDBDocumentClient;

export function getDynamoDb() {
  if (!dynamoDb) {
    const client = new DynamoDBClient(CONFIG.database);
    dynamoDb = DynamoDBDocumentClient.from(client);
  }
  return dynamoDb;
}
