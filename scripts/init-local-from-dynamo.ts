import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import type { Repository_v2, RepositoryMirror, RepositoryRole } from '../src/types/repository_v2.js';

// Initialize DynamoDB client with local credentials
const client = new DynamoDBClient({
  region: 'local',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local'
  }
});

const docClient = DynamoDBDocumentClient.from(client);

// Function to read and parse gzipped JSON file
async function readGzippedJson(filePath: string): Promise<any> {
  const chunks: Buffer[] = [];
  await pipeline(
    createReadStream(filePath),
    createGunzip(),
    async function* (source) {
      for await (const chunk of source) {
        chunks.push(chunk);
      }
    }
  );
  return JSON.parse(Buffer.concat(chunks).toString());
}

interface DynamoMirror {
  prefix?: string;
  is_primary?: boolean;
  [key: string]: any;
}

interface DynamoRole {
  role?: 'viewer' | 'admin' | 'contributor';
  [key: string]: any;
}

// Function to sanitize repository data by removing sensitive information
function sanitizeRepository(repo: any): Repository_v2 {
  const now = new Date().toISOString();
  
  // Create a sanitized mirror configuration
  const mirrors: Record<string, RepositoryMirror> = {};
  for (const [key, mirror] of Object.entries(repo.metadata?.mirrors || {})) {
    const dynMirror = mirror as DynamoMirror;
    mirrors[key] = {
      storage_type: 's3',
      connection_id: 'default-connection',
      prefix: dynMirror.prefix || `${repo.account_id}/${repo.repository_id}/`,
      config: {
        region: 'us-west-2',
        bucket: 'opendata.source.coop'
      },
      is_primary: dynMirror.is_primary || false,
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

  // Create sanitized roles
  const roles: Record<string, RepositoryRole> = {};
  for (const [accountId, role] of Object.entries(repo.metadata?.roles || {})) {
    const dynRole = role as DynamoRole;
    roles[accountId] = {
      account_id: accountId,
      role: dynRole.role || 'viewer',
      granted_at: now,
      granted_by: accountId
    };
  }

  return {
    repository_id: repo.repository_id,
    account_id: repo.account_id,
    title: repo.title || 'Untitled Repository',
    description: repo.description || '',
    created_at: repo.created_at || now,
    updated_at: now,
    visibility: repo.visibility || 'public',
    metadata: {
      mirrors,
      primary_mirror: repo.metadata?.primary_mirror || Object.keys(mirrors)[0],
      tags: repo.metadata?.tags || [],
      roles
    }
  };
}

async function initializeFromDynamoDump() {
  try {
    console.log('Reading DynamoDB dump...');
    
    // Read the DynamoDB dump file
    const dumpPath = join(process.cwd(), 'dynamodownload', '01743449552341-6d28931b', 'data', 'eivyxj3smi2mpc3mtpbtvl6cfm.json.gz');
    const data = await readGzippedJson(dumpPath);
    
    console.log('Processing repositories...');
    
    // Process each repository
    for (const item of data.Items) {
      if (item.type === 'repository') {
        const sanitizedRepo = sanitizeRepository(item);
        
        // Save to DynamoDB
        await docClient.send(new PutCommand({
          TableName: 'sc-repositories',
          Item: sanitizedRepo
        }));
        
        console.log(`Processed repository: ${sanitizedRepo.account_id}/${sanitizedRepo.repository_id}`);
      }
    }
    
    console.log('Initialization complete!');
  } catch (error) {
    console.error('Error initializing from DynamoDB dump:', error);
  }
}

// Run the initialization
initializeFromDynamoDump(); 