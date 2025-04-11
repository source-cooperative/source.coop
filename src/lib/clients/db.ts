import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { awsCredentialsProvider } from "@vercel/functions/oidc";
import { CONFIG } from "../config";

// Singleton instances
let dynamoDb: DynamoDBDocumentClient;

export function getDynamoDb() {
  if (!dynamoDb) {
    dynamoDb = DynamoDBDocumentClient.from(
      new DynamoDBClient({
        region: CONFIG.database.region,
        credentials: awsCredentialsProvider({
          roleArn: CONFIG.database.roleArn,
        }),
      })
    );
  }
  return dynamoDb;
}
