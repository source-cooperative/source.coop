import { getDynamoDb } from '../clients';
import { ScanCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Account } from '@/types/account';
import type { Repository } from '@/types/repository';

export async function scanTable<T>(tableName: string): Promise<T[]> {
  const db = getDynamoDb();
  const result = await db.send(new ScanCommand({ TableName: tableName }));
  return (result.Items as T[]) || [];
}

export async function getItem<T>(
  tableName: string,
  key: Record<string, unknown>
): Promise<T | null> {
  const db = getDynamoDb();
  const result = await db.send(
    new GetCommand({
      TableName: tableName,
      Key: key,
    })
  );
  return (result.Item as T) || null;
}

export const fetchAccounts = () => scanTable<Account>('Accounts');
export const fetchRepositories = () => scanTable<Repository>('Repositories'); 