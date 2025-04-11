import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { CONFIG } from "../config";
import { createStorageClient } from "./storage";
import type { StorageClient } from "@/types/storage";

// Singleton instances
let dynamoDb: DynamoDBDocumentClient;
let storage: StorageClient;

export function getDynamoDb() {
  if (!dynamoDb) {
    const client = new DynamoDBClient();
    dynamoDb = DynamoDBDocumentClient.from(client);
  }
  return dynamoDb;
}

export function getStorage() {
  if (!storage) {
    storage = createStorageClient();
  }
  return storage;
}
