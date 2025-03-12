import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CONFIG } from './config';
import { getStorageClient } from './storage/config';
import type { StorageClient } from '@/types/storage';

// Singleton instances
let dynamoDb: DynamoDBDocumentClient;
let storage: StorageClient;

export function getDynamoDb() {
  if (!dynamoDb) {
    const client = new DynamoDBClient(CONFIG.database);
    dynamoDb = DynamoDBDocumentClient.from(client);
  }
  return dynamoDb;
}

export function getStorage() {
  if (!storage) {
    storage = getStorageClient();
  }
  return storage;
} 