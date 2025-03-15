import { getDynamoDb } from '../clients';
import { ScanCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Account } from '@/types/account';
import type { Repository } from '@/types';

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

export async function fetchRepositories(): Promise<Repository[]> {
  try {
    const repositories = await scanTable<any>('Repositories');
    const accounts = await scanTable<Account>('Accounts');
    
    // Create a map of account_id to Account for easy lookup
    const accountMap = new Map(accounts.map(account => [account.account_id, account]));
    
    // First filter out invalid repositories, then map to Repository type
    return repositories
      .filter((repo): repo is any => {
        if (!repo || !repo.repository_id || !repo.account_id) {
          console.warn('Missing required fields in repository:', repo);
          return false;
        }
        // Ensure account exists for this repository
        if (!accountMap.get(repo.account_id)) {
          console.warn(`Account not found for account_id: ${repo.account_id}`);
          return false;
        }
        return true;
      })
      .map((repo): Repository => ({
        repository_id: repo.repository_id,
        account: accountMap.get(repo.account_id)!, // Safe to use ! because we filtered above
        title: repo.title || repo.repository_id,
        description: repo.description || '',
        private: !!repo.private,
        created_at: repo.created_at || new Date().toISOString(),
        updated_at: repo.updated_at || new Date().toISOString(),
        metadata_files: repo.metadata_files || {},
        root_metadata: repo.root_metadata || {}
      }));
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return [];
  }
} 