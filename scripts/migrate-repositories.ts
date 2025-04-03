import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createGunzip } from 'zlib';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import type { Repository_v2, RepositoryMirror, RepositoryRole } from '../src/types/repository_v2.js';

// Initialize DynamoDB client with local credentials
const client = new DynamoDBClient({
  region: 'local',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID || 'local',
    secretAccessKey: process.env.DYNAMODB_SECRET_ACCESS_KEY || 'local'
  }
});

const docClient = DynamoDBDocumentClient.from(client);

// Old repository format from the dump
interface OldRepository {
  account_id: string;
  repository_id: string;
  published: string;
  data: {
    mirrors: {
      [key: string]: {
        prefix: string;
        data_connection_id: string;
      }
    };
    primary_mirror: string;
  };
  meta: {
    title: string;
    description?: string;
    tags?: string[];
  };
  disabled: boolean;
  data_mode: 'open' | 'private';
  featured: number;
  state: 'listed' | 'unlisted';
}

// Helper function to safely get DynamoDB attribute value
function getAttributeValue(obj: any, path: string[]): any {
  let current = obj;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

// Convert old repository format to new format
function convertRepository(oldRepo: OldRepository): Repository_v2 {
  const now = new Date().toISOString();
  
  // Convert mirrors to new format
  const mirrors: Record<string, RepositoryMirror> = {};
  for (const [key, mirror] of Object.entries(oldRepo.data.mirrors)) {
    mirrors[key] = {
      storage_type: 's3',
      connection_id: mirror.data_connection_id,
      prefix: mirror.prefix,
      config: {
        region: 'us-west-2',
        bucket: 'aws-opendata-us-west-2'
      },
      is_primary: key === oldRepo.data.primary_mirror,
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

  // Create default role for the owner
  const roles: Record<string, RepositoryRole> = {
    [oldRepo.account_id]: {
      account_id: oldRepo.account_id,
      role: 'admin',
      granted_at: now,
      granted_by: oldRepo.account_id
    }
  };

  // Convert visibility based on old fields
  const visibility = oldRepo.data_mode === 'open' 
    ? (oldRepo.state === 'listed' ? 'public' : 'unlisted')
    : 'restricted';

  return {
    repository_id: oldRepo.repository_id,
    account_id: oldRepo.account_id,
    title: oldRepo.meta.title,
    description: oldRepo.meta.description || '',
    created_at: oldRepo.published,
    updated_at: now,
    visibility,
    metadata: {
      mirrors,
      primary_mirror: oldRepo.data.primary_mirror,
      tags: oldRepo.meta.tags || [],
      roles
    }
  };
}

async function processDumpFile(filePath: string) {
  const repositories: Repository_v2[] = [];
  
  // Create a pipeline to read and parse the gzipped JSON file
  await pipeline(
    createReadStream(filePath),
    createGunzip(),
    async function* (source) {
      let buffer = '';
      for await (const chunk of source) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const item = JSON.parse(line);
              if (item.Item) {
                // Safely extract values using helper function
                const account_id = getAttributeValue(item.Item, ['account_id', 'S']);
                const repository_id = getAttributeValue(item.Item, ['repository_id', 'S']);
                const published = getAttributeValue(item.Item, ['published', 'S']);
                const data = getAttributeValue(item.Item, ['data', 'M']);
                const meta = getAttributeValue(item.Item, ['meta', 'M']);
                const disabled = getAttributeValue(item.Item, ['disabled', 'BOOL']);
                const data_mode = getAttributeValue(item.Item, ['data_mode', 'S']);
                const featured = getAttributeValue(item.Item, ['featured', 'N']);
                const state = getAttributeValue(item.Item, ['state', 'S']);

                // Skip if required fields are missing
                if (!account_id || !repository_id || !published || !data || !meta) {
                  console.warn('Skipping item with missing required fields:', { account_id, repository_id });
                  continue;
                }

                // Convert mirrors
                const mirrors: Record<string, any> = {};
                const mirrorsMap = getAttributeValue(data, ['mirrors', 'M']) || {};
                for (const [key, value] of Object.entries(mirrorsMap)) {
                  const prefix = getAttributeValue(value, ['M', 'prefix', 'S']);
                  const data_connection_id = getAttributeValue(value, ['M', 'data_connection_id', 'S']);
                  if (prefix && data_connection_id) {
                    mirrors[key] = { prefix, data_connection_id };
                  }
                }

                // Convert tags
                const tags = (getAttributeValue(meta, ['tags', 'L']) || [])
                  .map((tag: any) => getAttributeValue(tag, ['S']))
                  .filter(Boolean);

                const oldRepo: OldRepository = {
                  account_id,
                  repository_id,
                  published,
                  data: {
                    mirrors,
                    primary_mirror: getAttributeValue(data, ['primary_mirror', 'S']) || Object.keys(mirrors)[0]
                  },
                  meta: {
                    title: getAttributeValue(meta, ['title', 'S']) || repository_id,
                    description: getAttributeValue(meta, ['description', 'S']),
                    tags
                  },
                  disabled: disabled ?? false,
                  data_mode: data_mode || 'open',
                  featured: parseInt(featured || '0'),
                  state: state || 'unlisted'
                };
                
                repositories.push(convertRepository(oldRepo));
              }
            } catch (e) {
              console.error('Error parsing line:', e);
              console.error('Problematic line:', line);
            }
          }
        }
      }
    }
  );

  return repositories;
}

async function migrateRepositories() {
  try {
    // Process both dump files
    console.log('Processing first dump file...');
    const repositories1 = await processDumpFile('dynamodownload/01743449552341-6d28931b/data/eivyxj3smi2mpc3mtpbtvl6cfm.json.gz');
    console.log(`Found ${repositories1.length} repositories in first file`);

    console.log('Processing second dump file...');
    const repositories2 = await processDumpFile('dynamodownload/01743449800394-e8d5e1a3/data/avi2syzkru2hfcoizz7kzdfin4.json.gz');
    console.log(`Found ${repositories2.length} repositories in second file`);
    
    const allRepositories = [...repositories1, ...repositories2];
    console.log(`Total repositories to migrate: ${allRepositories.length}`);

    // Insert repositories into local DynamoDB
    for (const repo of allRepositories) {
      try {
        await docClient.send(new PutCommand({
          TableName: 'sc-repositories',
          Item: repo
        }));
        console.log(`Migrated repository: ${repo.account_id}/${repo.repository_id}`);
      } catch (e) {
        console.error(`Error migrating repository ${repo.repository_id}:`, e);
      }
    }

    console.log('Migration completed successfully');
  } catch (e) {
    console.error('Error during migration:', e);
  }
}

// Run the migration
migrateRepositories().catch(console.error); 