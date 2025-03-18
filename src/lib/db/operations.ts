import { getDynamoDb } from '../clients';
import { ScanCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Account } from '@/types/account';
import type { Repository } from '@/types';

// DynamoDB attribute types
interface DynamoDBString {
  S: string;
}

interface DynamoDBBoolean {
  BOOL: boolean;
}

interface DynamoDBMap {
  M: Record<string, any>;
}

interface DynamoDBStringSet {
  SS: string[];
}

type DynamoDBAttribute = string | DynamoDBString | DynamoDBBoolean | DynamoDBMap | DynamoDBStringSet;

interface DynamoDBRepository {
  repository_id: DynamoDBAttribute;
  account_id: DynamoDBAttribute;
  title: DynamoDBAttribute;
  description: DynamoDBAttribute;
  private: DynamoDBAttribute;
  created_at: DynamoDBAttribute;
  updated_at: DynamoDBAttribute;
  metadata_files: DynamoDBAttribute;
}

interface DynamoDBAccount {
  account_id: DynamoDBAttribute;
  type: DynamoDBAttribute;
  name: DynamoDBAttribute;
  description: DynamoDBAttribute;
  email?: DynamoDBAttribute;
  website?: DynamoDBAttribute;
  orcid?: DynamoDBAttribute;
  owner_account_id?: DynamoDBAttribute;
  admin_account_ids?: DynamoDBAttribute;
  created_at: DynamoDBAttribute;
  updated_at: DynamoDBAttribute;
  logo_svg?: DynamoDBAttribute;
  logo_dark_mode_svg?: DynamoDBAttribute;
}

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

function extractDynamoString(attr: DynamoDBAttribute): string {
  return typeof attr === 'object' && 'S' in attr ? attr.S : attr as string;
}

function extractDynamoStringSet(attr: DynamoDBAttribute): string[] {
  return typeof attr === 'object' && 'SS' in attr ? attr.SS : [];
}

export async function fetchAccounts(): Promise<Account[]> {
  const accounts = await scanTable<any>('Accounts');
  
  return accounts.map(account => ({
    ...account,
    // Transform DynamoDB StringSet to array if it exists
    admin_account_ids: account.admin_account_ids?.SS || [],
    // Extract string values from DynamoDB format
    account_id: account.account_id?.S || account.account_id,
    name: account.name?.S || account.name,
    type: account.type?.S || account.type,
    description: account.description?.S || account.description,
    email: account.email?.S || account.email,
    website: account.website?.S || account.website,
    created_at: account.created_at?.S || account.created_at,
    updated_at: account.updated_at?.S || account.updated_at,
    owner_account_id: account.owner_account_id?.S || account.owner_account_id,
    ror_id: account.ror_id?.S || account.ror_id,
    logo_svg: account.logo_svg?.S || account.logo_svg,
    logo_dark_mode_svg: account.logo_dark_mode_svg?.S || account.logo_dark_mode_svg,
  }));
}

export async function fetchRepositories(): Promise<Repository[]> {
  try {
    const repositories = await scanTable<DynamoDBRepository>('Repositories');
    const accounts = await scanTable<DynamoDBAccount>('Accounts');
    
    // Create a map of account_id to Account for easy lookup
    const entries: [string, Account][] = accounts.map(account => {
      const accountId = extractDynamoString(account.account_id);
      const type = extractDynamoString(account.type) as 'individual' | 'organization';
      
      const baseAccount = {
        account_id: accountId,
        type,
        name: extractDynamoString(account.name),
        description: extractDynamoString(account.description),
        created_at: extractDynamoString(account.created_at),
        updated_at: extractDynamoString(account.updated_at),
      };

      if (type === 'individual') {
        return [accountId, {
          ...baseAccount,
          type: 'individual' as const,
          email: account.email ? extractDynamoString(account.email) : '',
          website: account.website ? extractDynamoString(account.website) : undefined,
          orcid: account.orcid ? extractDynamoString(account.orcid) : undefined,
        }];
      } else {
        return [accountId, {
          ...baseAccount,
          type: 'organization' as const,
          owner_account_id: account.owner_account_id ? extractDynamoString(account.owner_account_id) : '',
          admin_account_ids: account.admin_account_ids ? extractDynamoStringSet(account.admin_account_ids) : [],
          website: account.website ? extractDynamoString(account.website) : undefined,
          email: account.email ? extractDynamoString(account.email) : undefined,
          logo_svg: account.logo_svg ? extractDynamoString(account.logo_svg) : undefined,
          logo_dark_mode_svg: account.logo_dark_mode_svg ? extractDynamoString(account.logo_dark_mode_svg) : undefined,
        }];
      }
    });
    
    const accountMap = new Map(entries);
    
    // First filter out invalid repositories, then map to Repository type
    return repositories
      .filter((repo): repo is DynamoDBRepository => {
        const accountId = extractDynamoString(repo.account_id);
        const repoId = extractDynamoString(repo.repository_id);
        
        if (!repo || !repoId || !accountId) {
          return false;
        }
        
        // Ensure account exists for this repository
        if (!accountMap.get(accountId)) {
          return false;
        }
        
        return true;
      })
      .map(repo => {
        const accountId = extractDynamoString(repo.account_id);
        return {
          repository_id: extractDynamoString(repo.repository_id),
          account_id: accountId,
          account: accountMap.get(accountId)!,
          title: extractDynamoString(repo.title),
          description: extractDynamoString(repo.description),
          private: typeof repo.private === 'object' && 'BOOL' in repo.private
            ? repo.private.BOOL
            : !!repo.private,
          created_at: extractDynamoString(repo.created_at),
          updated_at: extractDynamoString(repo.updated_at),
          metadata_files: typeof repo.metadata_files === 'object' && 'M' in repo.metadata_files
            ? repo.metadata_files.M
            : repo.metadata_files as Record<string, any>
        };
      });
  } catch (error) {
    return [];
  }
} 