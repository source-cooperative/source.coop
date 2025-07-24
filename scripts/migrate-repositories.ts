import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createGunzip } from 'zlib';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import type {
  Product,
  ProductMirror,
  ProductRole,
} from "../src/types/product_v2.js";

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
interface OldProduct {
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
function convertProduct(oldProduct: OldProduct): Product {
  const now = new Date().toISOString();

  // Convert mirrors to new format
  const mirrors: Record<string, ProductMirror> = {};
  for (const [key, mirror] of Object.entries(oldProduct.data.mirrors)) {
    mirrors[key] = {
      storage_type: "s3",
      connection_id: mirror.data_connection_id,
      prefix: mirror.prefix,
      config: {
        region: "us-west-2",
        bucket: "aws-opendata-us-west-2",
      },
      is_primary: key === oldProduct.data.primary_mirror,
      sync_status: {
        last_sync_at: now,
        is_synced: true,
      },
      stats: {
        total_objects: 0,
        total_size: 0,
        last_verified_at: now,
      },
    };
  }

  // Create default role for the owner
  const roles: Record<string, ProductRole> = {
    [oldProduct.account_id]: {
      account_id: oldProduct.account_id,
      role: "admin",
      granted_at: now,
      granted_by: oldProduct.account_id,
    },
  };

  // Convert visibility based on old fields
  const visibility =
    oldProduct.data_mode === "open"
      ? oldProduct.state === "listed"
        ? "public"
        : "unlisted"
      : "restricted";

  return {
    product_id: oldProduct.repository_id,
    account_id: oldProduct.account_id,
    title: oldProduct.meta.title,
    description: oldProduct.meta.description || "",
    created_at: oldProduct.published,
    updated_at: now,
    visibility,
    metadata: {
      mirrors,
      primary_mirror: oldProduct.data.primary_mirror,
      tags: oldProduct.meta.tags || [],
      roles,
    },
  };
}

async function processDumpFile(filePath: string) {
  const products: Product[] = [];
  
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

                const oldProduct: OldProduct = {
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
                
                products.push(convertProduct(oldProduct));
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

  return products;
}

async function migrateProducts() {
  try {
    // Process both dump files
    console.log('Processing first dump file...');
    const products1 = await processDumpFile('dynamodownload/01743449552341-6d28931b/data/eivyxj3smi2mpc3mtpbtvl6cfm.json.gz');
    console.log(`Found ${products1.length} products in first file`);

    console.log('Processing second dump file...');
    const products2 = await processDumpFile('dynamodownload/01743449800394-e8d5e1a3/data/avi2syzkru2hfcoizz7kzdfin4.json.gz');
    console.log(`Found ${products2.length} products in second file`);
    
    const allProducts = [...products1, ...products2];
    console.log(`Total products to migrate: ${allProducts.length}`);

    // Insert products into local DynamoDB
    for (const product of allProducts) {
      try {
        await docClient.send(new PutCommand({
          TableName: 'sc-products',
          Item: product
        }));
        console.log(`Migrated product: ${product.account_id}/${product.product_id}`);
      } catch (e) {
        console.error(`Error migrating product ${product.product_id}:`, e);
      }
    }

    console.log('Migration completed successfully');
  } catch (e) {
    console.error('Error during migration:', e);
  }
}

// Run the migration
migrateProducts().catch(console.error); 