import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Repository_v2 } from '../src/types/repository_v2.js';

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

async function updateRepositoryS3Config() {
  try {
    // Get the repository
    const getResult = await docClient.send(new GetCommand({
      TableName: 'sc-repositories',
      Key: {
        repository_id: 'de-mv',
        account_id: 'fiboa'
      }
    }));

    if (!getResult.Item) {
      console.error('Repository not found');
      return;
    }

    const repo = getResult.Item as Repository_v2;
    const now = new Date().toISOString();

    // Update the S3 configuration
    const updatedRepo: Repository_v2 = {
      ...repo,
      metadata: {
        ...repo.metadata,
        mirrors: {
          'aws-us-west-2': {
            storage_type: 's3',
            connection_id: 'default-connection',
            prefix: `${repo.account_id}/${repo.repository_id}/`,
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
          }
        },
        primary_mirror: 'aws-us-west-2'
      }
    };

    // Update the repository
    await docClient.send(new PutCommand({
      TableName: 'sc-repositories',
      Item: updatedRepo
    }));

    console.log('Repository S3 configuration updated successfully');
  } catch (error) {
    console.error('Error updating repository:', error);
  }
}

updateRepositoryS3Config(); 