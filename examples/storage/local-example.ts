import { LocalStorageClient } from '../../src/lib/storage';
import { StorageProvider, StorageConfig } from '../../src/types/storage';

async function main() {
  // Set up provider and config
  const provider: StorageProvider = {
    provider_id: 'local-1',
    type: 'LOCAL',
    endpoint: './data/storage', // This will be relative to project root
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const config: StorageConfig = {
    type: 'LOCAL',
    endpoint: './data/storage',
  };

  // Create client
  const storage = new LocalStorageClient(provider, config);

  // Example usage
  const testPath = {
    account_id: 'acc123',
    repository_id: 'repo456',
    object_path: 'test/hello.txt'
  };

  try {
    // Store a file
    const content = Buffer.from('Hello, World!');
    const objectInfo = await storage.putObject({
      ...testPath,
      data: content,
      contentType: 'text/plain'
    });
    console.log('Stored object:', objectInfo);

    // Read it back
    const retrieved = await storage.getObject(testPath);
    console.log('Retrieved content:', retrieved.toString());

    // Delete it
    await storage.deleteObject(testPath);
    console.log('Object deleted');
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 