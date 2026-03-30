#!/usr/bin/env tsx
/**
 * Backfill script to add `search_text` to existing products in DynamoDB.
 *
 * This computes search_text as:
 *   [title, description, account_id, product_id].filter(Boolean).join(" ").toLowerCase()
 *
 * Usage:
 *   npx tsx scripts/backfill-search-text.ts <table-name>
 *
 * Examples:
 *   npx tsx scripts/backfill-search-text.ts sc-dev-products
 *   npx tsx scripts/backfill-search-text.ts sc-prod-products
 *
 * Environment variables:
 *   AWS_REGION        - AWS region (default: us-east-1)
 *   AWS_PROFILE       - AWS profile to use (optional)
 *   DRY_RUN           - Set to "true" to preview changes without writing (optional)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

interface ProductItem {
  account_id: string;
  product_id: string;
  title?: string;
  description?: string;
  search_text?: string;
}

function buildSearchText(product: ProductItem): string {
  return [
    product.title,
    product.description,
    product.account_id,
    product.product_id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

async function backfill(tableName: string, dryRun: boolean) {
  const region = process.env.AWS_REGION || "us-east-1";

  console.log(`Backfill search_text for table: ${tableName}`);
  console.log(`Region: ${region}`);
  console.log(`Dry run: ${dryRun}`);
  console.log("");

  const dbClient = new DynamoDBClient({ region });
  const client = DynamoDBDocumentClient.from(dbClient, {
    marshallOptions: { removeUndefinedValues: true },
  });

  let lastEvaluatedKey: Record<string, any> | undefined;
  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  do {
    const scanParams: any = {
      TableName: tableName,
      FilterExpression: "attribute_exists(account_id)",
      ProjectionExpression:
        "account_id, product_id, title, description, search_text",
    };

    if (lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const result = await client.send(new ScanCommand(scanParams));
    const items = (result.Items || []) as ProductItem[];
    lastEvaluatedKey = result.LastEvaluatedKey;
    scanned += items.length;

    for (const item of items) {
      const newSearchText = buildSearchText(item);

      // Skip if search_text is already correct (idempotent)
      if (item.search_text === newSearchText) {
        skipped++;
        continue;
      }

      if (dryRun) {
        console.log(
          `[DRY RUN] Would update ${item.account_id}/${item.product_id}: "${newSearchText.substring(0, 80)}..."`
        );
        updated++;
        continue;
      }

      try {
        await client.send(
          new UpdateCommand({
            TableName: tableName,
            Key: {
              account_id: item.account_id,
              product_id: item.product_id,
            },
            UpdateExpression: "SET search_text = :search_text",
            ExpressionAttributeValues: {
              ":search_text": newSearchText,
            },
          })
        );
        updated++;
      } catch (err) {
        errors++;
        console.error(
          `Error updating ${item.account_id}/${item.product_id}:`,
          err
        );
      }
    }

    console.log(
      `Progress: scanned=${scanned}, updated=${updated}, skipped=${skipped}, errors=${errors}`
    );
  } while (lastEvaluatedKey);

  console.log("");
  console.log("Backfill complete.");
  console.log(`  Total scanned: ${scanned}`);
  console.log(`  Updated:       ${updated}`);
  console.log(`  Skipped:       ${skipped} (already had correct search_text)`);
  console.log(`  Errors:        ${errors}`);
}

// Main
const tableName = process.argv[2];

if (!tableName) {
  console.error(
    "Usage: npx tsx scripts/backfill-search-text.ts <table-name>"
  );
  console.error("");
  console.error("Examples:");
  console.error("  npx tsx scripts/backfill-search-text.ts sc-dev-products");
  console.error("  npx tsx scripts/backfill-search-text.ts sc-prod-products");
  console.error("");
  console.error("Environment variables:");
  console.error("  AWS_REGION  - AWS region (default: us-east-1)");
  console.error("  AWS_PROFILE - AWS profile to use (optional)");
  console.error(
    '  DRY_RUN     - Set to "true" to preview changes without writing'
  );
  process.exit(1);
}

const dryRun = process.env.DRY_RUN === "true";

backfill(tableName, dryRun).catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
