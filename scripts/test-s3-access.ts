import { S3StorageClient } from '../src/lib/storage/s3';
import type { StorageProvider, StorageConfig } from '../src/types/storage';

async function testS3Access() {
  const provider: StorageProvider = {
    provider_id: 's3',
    type: 'S3',
    endpoint: 'us-west-2.opendata.source.coop',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const config: StorageConfig = {
    type: 'S3',
    endpoint: 'us-west-2.opendata.source.coop',
    region: 'us-west-2',
  };

  const client = new S3StorageClient(provider, config);

  try {
    console.log('Testing S3 access to public bucket...');
    const result = await client.listObjects({
      account_id: 'fiboa',
      repository_id: 'de-mv',
      prefix: '',
      delimiter: '/',
      object_path: '',
    });

    console.log('Successfully listed objects:');
    console.log('Objects:', result.objects);
    console.log('Common Prefixes:', result.commonPrefixes);
  } catch (error) {
    console.error('Error accessing S3:', error);
  }
}

testS3Access(); 