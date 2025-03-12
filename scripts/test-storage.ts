import { LocalStorageClient } from '../src/lib/storage/local';
import { StorageProvider, StorageProviderConfig } from '../src/lib/storage';

async function testStorage() {
  // Configure storage provider
  const provider: StorageProvider = {
    provider_id: 'local-test',
    type: 'LOCAL',
    endpoint: './test-storage',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const config: StorageProviderConfig = {
    type: 'LOCAL',
    endpoint: './test-storage',
  };

  const storage = new LocalStorageClient(provider, config);

  // Define some example repositories and their data
  const testData = [
    {
      account_id: 'usgs',
      repository_id: 'landsat-c2-l2',
      files: [
        {
          path: 'README.md',
          content: 'This is the Landsat Collection 2 Level-2 Science Products repository'
        },
        {
          path: 'metadata/stac-catalog.json',
          content: JSON.stringify({
            type: 'Catalog',
            id: 'landsat-c2-l2',
            description: 'USGS Landsat Collection 2 Level-2 Science Products',
            links: []
          }, null, 2)
        }
      ]
    },
    {
      account_id: 'microsoft',
      repository_id: 'global-building-footprints',
      files: [
        {
          path: 'README.md',
          content: 'Microsoft Global Building Footprints dataset'
        },
        {
          path: 'metadata/dataset-info.json',
          content: JSON.stringify({
            name: 'Global Building Footprints',
            description: 'Building footprints derived from satellite imagery',
            version: '2.0'
          }, null, 2)
        }
      ]
    },
    {
      account_id: 'nasa',
      repository_id: 'srtm-dem',
      files: [
        {
          path: 'README.md',
          content: 'NASA Shuttle Radar Topography Mission Digital Elevation Model'
        },
        {
          path: 'metadata/coverage.json',
          content: JSON.stringify({
            spatial_coverage: 'global',
            resolution: '30m',
            year: 2000
          }, null, 2)
        }
      ]
    }
  ];

  // Store all test data
  for (const repo of testData) {
    console.log(`\nPopulating repository: ${repo.account_id}/${repo.repository_id}`);
    
    for (const file of repo.files) {
      const objectPath = {
        account_id: repo.account_id,
        repository_id: repo.repository_id,
        object_path: file.path
      };

      try {
        const result = await storage.putObject(
          objectPath,
          Buffer.from(file.content)
        );
        console.log(`✓ Stored ${file.path}`);
        
        // Verify by reading back
        const retrieved = await storage.getObject(objectPath);
        console.log(`  Verified ${file.path} (${retrieved.length} bytes)`);
      } catch (error) {
        console.error(`✗ Failed to store ${file.path}:`, error);
      }
    }
  }
}

testStorage().catch(console.error);