import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Singleton instances
let dynamoDb: DynamoDBDocumentClient;

export function getDynamoDb() {
  if (!dynamoDb) {
    const client = new DynamoDBClient();
    dynamoDb = DynamoDBDocumentClient.from(client);
  }
  return dynamoDb;
}
