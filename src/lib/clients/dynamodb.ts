import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Repository } from "@/types/repository";
import { Account } from '@/types/account';

const client = new DynamoDBClient({
  endpoint: "http://localhost:8000",
  region: "us-east-1",
  credentials: {
    accessKeyId: "local",
    secretAccessKey: "local"
  }
});

const docClient = DynamoDBDocumentClient.from(client);

export async function fetchRepositories(): Promise<Repository[]> {
  try {
    const data = await docClient.send(
      new ScanCommand({
        TableName: "Repositories"
      })
    );
    return (data.Items as Repository[]) || [];
  } catch (error) {
    console.error("Error fetching repositories:", error);
    throw error;
  }
}

export async function fetchAccounts(): Promise<Account[]> {
  try {
    const data = await docClient.send(
      new ScanCommand({
        TableName: "Accounts"
      })
    );
    return (data.Items as Account[]) || [];
  } catch (error) {
    console.error("Error fetching accounts:", error);
    throw error;
  }
} 