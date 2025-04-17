// Script to convert DynamoDB dump data to the new schema format
import { createReadStream, writeFileSync } from 'fs';
import { createGunzip } from 'zlib';
import { createInterface } from 'readline';
import { join } from 'path';
import type { Account, IndividualAccount, OrganizationalAccount } from '../src/types/account_v2';
import type { Repository_v2, RepositoryMirror, RepositoryRole } from '../src/types/repository_v2';

// Utility function to extract value from DynamoDB attribute format
function extractValue(attr: any): any {
  if (!attr) return null;
  
  if (attr.S !== undefined) return attr.S;
  if (attr.N !== undefined) return Number(attr.N);
  if (attr.BOOL !== undefined) return attr.BOOL;
  if (attr.NULL !== undefined) return null;
  
  if (attr.M) {
    const obj: Record<string, any> = {};
    Object.entries(attr.M).forEach(([key, value]) => {
      obj[key] = extractValue(value);
    });
    return obj;
  }
  
  if (attr.L) {
    return attr.L.map((item: any) => extractValue(item));
  }
  
  return attr; // Default fallback
}

// Function to read and parse gzipped JSON file line by line
async function readGzippedJson(filePath: string): Promise<any[]> {
  console.log(`Reading ${filePath}...`);
  const items: any[] = [];
  const fileStream = createReadStream(filePath).pipe(createGunzip());
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.trim()) {
      try {
        const rawItem = JSON.parse(line);
        // Extract the item and normalize the DynamoDB attribute format
        const item = rawItem.Item || rawItem;
        const normalizedItem: Record<string, any> = {};
        
        Object.entries(item).forEach(([key, value]) => {
          normalizedItem[key] = extractValue(value);
        });
        
        items.push(normalizedItem);
      } catch (e) {
        console.warn('Failed to parse line:', line.substring(0, 100) + '...');
      }
    }
  }

  console.log(`Loaded ${items.length} items from ${filePath}`);
  return items;
}

// Convert old account format to new account schema
function convertAccount(oldAccount: any): Account | null {
  const now = new Date().toISOString();
  
  try {
    // Basic validation
    if (!oldAccount.account_id) {
      console.warn('Account missing account_id, skipping');
      return null;
    }
    
    // Determine account type
    const accountType = oldAccount.account_type === 'organization' ? 'organization' : 'individual';
    
    const baseAccount = {
      account_id: oldAccount.account_id,
      type: accountType as 'individual' | 'organization',
      name: oldAccount.profile?.name || oldAccount.account_id,
      emails: [],
      created_at: oldAccount.created || now,
      updated_at: now,
      disabled: oldAccount.disabled || false,
      flags: Array.isArray(oldAccount.flags) ? oldAccount.flags : [],
      metadata_private: {
        identity_id: oldAccount.identity_id || `ory_${Math.random().toString(36).substring(2, 15)}`
      }
    };
    
    if (accountType === 'individual') {
      const account: IndividualAccount = {
        ...baseAccount,
        type: 'individual',
        metadata_public: {
          bio: oldAccount.profile?.bio || '',
          location: oldAccount.profile?.location || '',
          orcid: oldAccount.profile?.orcid || '',
          domains: []
        }
      };
      return account;
    } else {
      const account: OrganizationalAccount = {
        ...baseAccount,
        type: 'organization',
        metadata_public: {
          bio: oldAccount.profile?.bio || '',
          location: oldAccount.profile?.location || '',
          domains: [],
          owner_account_id: oldAccount.profile?.owner_id || '',
          admin_account_ids: oldAccount.profile?.admin_ids || [],
          member_account_ids: oldAccount.profile?.member_ids || []
        }
      };
      return account;
    }
  } catch (error) {
    console.error(`Error converting account ${oldAccount.account_id}:`, error);
    return null;
  }
}

// Convert old repository format to new repository schema
function convertRepository(oldRepo: any): Repository_v2 | null {
  const now = new Date().toISOString();
  
  try {
    // Basic validation
    if (!oldRepo.repository_id || !oldRepo.account_id) {
      console.warn('Repository missing required fields, skipping');
      return null;
    }
    
    // Map visibility from old state field
    let visibility: 'public' | 'unlisted' | 'restricted' = 'restricted';
    if (oldRepo.state === 'listed') {
      visibility = 'public';
    } else if (oldRepo.state === 'unlisted') {
      visibility = 'unlisted';
    }
    
    // Create mirrors record
    const mirrors: Record<string, RepositoryMirror> = {};
    const oldMirrors = oldRepo.data?.mirrors || {};
    
    Object.entries(oldMirrors).forEach(([key, value]: [string, any]) => {
      const mirrorPrefix = value.prefix || `${oldRepo.account_id}/${oldRepo.repository_id}/`;
      
      mirrors[key] = {
        storage_type: 's3',
        connection_id: value.data_connection_id || 'default-connection',
        prefix: mirrorPrefix,
        config: {
          region: 'us-west-2',
          bucket: 'opendata.source.coop'
        },
        is_primary: key === oldRepo.data?.primary_mirror,
        sync_status: {
          last_sync_at: now,
          is_synced: true
        },
        stats: {
          total_objects: 0,
          total_size: 0,
          last_verified_at: now
        }
      };
    });
    
    // If no mirrors were found, create a default one
    if (Object.keys(mirrors).length === 0) {
      const defaultMirrorKey = 'default-mirror';
      mirrors[defaultMirrorKey] = {
        storage_type: 's3',
        connection_id: 'default-connection',
        prefix: `${oldRepo.account_id}/${oldRepo.repository_id}/`,
        config: {
          region: 'us-west-2',
          bucket: 'opendata.source.coop'
        },
        is_primary: true,
        sync_status: {
          last_sync_at: now,
          is_synced: true
        },
        stats: {
          total_objects: 0,
          total_size: 0,
          last_verified_at: now
        }
      };
    }
    
    // Extract tags
    const tags = oldRepo.meta?.tags || [];
    
    // Create roles (default to owner as admin)
    const roles: Record<string, RepositoryRole> = {
      [oldRepo.account_id]: {
        account_id: oldRepo.account_id,
        role: 'admin',
        granted_at: now,
        granted_by: oldRepo.account_id
      }
    };
    
    return {
      repository_id: oldRepo.repository_id,
      account_id: oldRepo.account_id,
      title: oldRepo.meta?.title || 'Untitled Repository',
      description: oldRepo.meta?.description || '',
      created_at: oldRepo.published || now,
      updated_at: now,
      visibility,
      metadata: {
        mirrors,
        primary_mirror: oldRepo.data?.primary_mirror || Object.keys(mirrors)[0],
        tags,
        roles
      }
    };
  } catch (error) {
    console.error(`Error converting repository ${oldRepo.repository_id}:`, error);
    return null;
  }
}

async function main() {
  try {
    console.log('Starting conversion of DynamoDB dump data...');
    
    // Read accounts data
    const accountsPath = join(process.cwd(), 'dynamodownload', '01743449552341-6d28931b', 'data', 'eivyxj3smi2mpc3mtpbtvl6cfm.json.gz');
    const oldAccounts = await readGzippedJson(accountsPath);
    
    // Read repositories data
    const reposPath = join(process.cwd(), 'dynamodownload', '01743449800394-e8d5e1a3', 'data', 'avi2syzkru2hfcoizz7kzdfin4.json.gz');
    const oldRepositories = await readGzippedJson(reposPath);
    
    console.log(`Converting ${oldAccounts.length} accounts...`);
    const convertedAccounts: Account[] = [];
    for (const oldAccount of oldAccounts) {
      const convertedAccount = convertAccount(oldAccount);
      if (convertedAccount) {
        convertedAccounts.push(convertedAccount);
      }
    }
    console.log(`Successfully converted ${convertedAccounts.length} accounts`);
    
    console.log(`Converting ${oldRepositories.length} repositories...`);
    const convertedRepositories: Repository_v2[] = [];
    for (const oldRepo of oldRepositories) {
      const convertedRepo = convertRepository(oldRepo);
      if (convertedRepo) {
        convertedRepositories.push(convertedRepo);
      }
    }
    console.log(`Successfully converted ${convertedRepositories.length} repositories`);
    
    // Save converted data to JSON files
    const outputDir = join(process.cwd(), 'scripts', 'converted-data');
    
    console.log(`Saving converted data to ${outputDir}...`);
    writeFileSync(
      join(outputDir, 'accounts.json'), 
      JSON.stringify(convertedAccounts, null, 2)
    );
    
    writeFileSync(
      join(outputDir, 'repositories.json'), 
      JSON.stringify(convertedRepositories, null, 2)
    );
    
    console.log('Conversion complete!');
  } catch (error) {
    console.error('Error converting data:', error);
    process.exit(1);
  }
}

main(); 