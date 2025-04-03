// Analyze DynamoDB dump structure
import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';
import { createInterface } from 'readline';

async function analyzeDumpStructure(filePath: string) {
  console.log(`Analyzing DynamoDB dump: ${filePath}`);
  
  const fileStream = createReadStream(filePath).pipe(createGunzip());
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let itemCount = 0;
  const typeCountMap: Record<string, number> = {};
  const sampleItems: Record<string, any> = {};
  const keyAttributes: Set<string> = new Set();

  // Analyze first 100 items in detail
  for await (const line of rl) {
    if (line.trim()) {
      try {
        const item = JSON.parse(line);
        itemCount++;
        
        // DynamoDB export format typically has an "Item" field containing actual attributes
        const actualItem = item.Item || item;
        
        // Collect all top-level keys to understand structure
        Object.keys(actualItem).forEach(key => keyAttributes.add(key));
        
        // Try to determine item type from various attributes
        let itemType = 'unknown';
        if (actualItem.type && typeof actualItem.type === 'object') {
          // Handle DynamoDB attribute format (e.g., { "S": "account" })
          const typeValue = actualItem.type.S || actualItem.type.N || actualItem.type.BOOL;
          if (typeValue) itemType = typeValue;
        } else if (typeof actualItem.type === 'string') {
          itemType = actualItem.type;
        } else if (actualItem.repository_id) {
          itemType = 'repository';
        } else if (actualItem.account_id && !actualItem.repository_id) {
          itemType = 'account';
        }
        
        typeCountMap[itemType] = (typeCountMap[itemType] || 0) + 1;
        
        // Save sample items (one for each type)
        if (!sampleItems[itemType] && itemType !== 'unknown') {
          sampleItems[itemType] = actualItem;
        }
        
        // If we've processed 100 items, break to avoid processing the entire file
        if (itemCount >= 100) {
          break;
        }
      } catch (e) {
        console.warn('Failed to parse line:', line.substring(0, 100) + '...');
      }
    }
  }

  console.log(`\nAnalyzed ${itemCount} items`);
  console.log('\nKey attributes found:');
  console.log([...keyAttributes].join(', '));
  
  console.log('\nItem types distribution:');
  Object.entries(typeCountMap).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} items`);
  });
  
  console.log('\nSample items by type:');
  Object.entries(sampleItems).forEach(([type, item]) => {
    console.log(`\n--- Sample ${type} item: ---`);
    console.log(JSON.stringify(item, null, 2));
  });
}

// Use the path to the gzipped DynamoDB dump
const dumpPath = process.argv[2] || 'dynamodownload/01743449552341-6d28931b/data/eivyxj3smi2mpc3mtpbtvl6cfm.json.gz';
analyzeDumpStructure(dumpPath); 