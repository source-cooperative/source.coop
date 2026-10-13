#!/usr/bin/env tsx
/**
 * Remove the legacy `data_mode` attribute from product records.
 *
 * `data_mode` (`open`, `private`, `subscription`) is the pre-#284 field that
 * `visibility` replaced; `load-dynamodb-exports.ts` copied it onto every
 * migrated product, and no code reads it since. The API hands back the
 * stored record, so it still reaches clients (the CLI showed it as if it
 * meant something).
 *
 * Readers checked across the org: the data proxy only names it in a comment;
 * metadata-catalog-pipeline (`seed.py`, `subdataset.py`) and ops-source's
 * `crawl_products.py` copy it with `.get("data_mode")`, so they get null
 * afterwards rather than failing.
 *
 * Only a record that also has `visibility` loses `data_mode` (the write's
 * ConditionExpression), so a product the migration never gave a visibility
 * keeps the only hint of what it was.
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/remove-product-data-mode.ts <table-name>
 *   npx tsx scripts/remove-product-data-mode.ts <table-name>
 *
 * Examples:
 *   DRY_RUN=1 npx tsx scripts/remove-product-data-mode.ts sc-staging-products
 *   npx tsx scripts/remove-product-data-mode.ts sc-prod-products
 *
 * Environment variables:
 *   AWS_REGION  - AWS region (default: us-east-1)
 *   AWS_PROFILE - AWS profile to use (optional)
 *   DRY_RUN     - Set (to anything) to preview changes without writing
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
  data_mode?: string;
  visibility?: string;
}

function isConditionalCheckFailed(err: unknown): boolean {
  return err instanceof Error && err.name === "ConditionalCheckFailedException";
}

async function run(tableName: string, dryRun: boolean) {
  const region = process.env.AWS_REGION || "us-east-1";

  console.log(`Table:   ${tableName}`);
  console.log(`Region:  ${region}`);
  console.log(`Dry run: ${dryRun}`);
  console.log("");

  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

  let lastEvaluatedKey: Record<string, unknown> | undefined;
  let scanned = 0;
  let removed = 0;
  let skipped = 0;
  // Records with `data_mode` but no `visibility`, which keep `data_mode`.
  let guarded = 0;
  let errors = 0;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: tableName,
        ProjectionExpression: "account_id, product_id, data_mode, visibility",
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );
    const items = (result.Items || []) as ProductItem[];
    lastEvaluatedKey = result.LastEvaluatedKey;
    scanned += items.length;

    for (const item of items) {
      const name = `${item.account_id}/${item.product_id}`;
      if (item.data_mode === undefined) {
        skipped++;
        continue;
      }
      // Mirror the live ConditionExpression, so a dry run counts the same.
      if (item.visibility === undefined) {
        guarded++;
        console.warn(
          `Keeping data_mode=${item.data_mode} on ${name}: no visibility`,
        );
        continue;
      }

      if (dryRun) {
        console.log(
          `[DRY RUN] Would remove data_mode=${item.data_mode} from ${name} (visibility=${item.visibility})`,
        );
        removed++;
        continue;
      }

      try {
        await client.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { account_id: item.account_id, product_id: item.product_id },
            UpdateExpression: "REMOVE data_mode",
            ConditionExpression: "attribute_exists(visibility)",
          }),
        );
        removed++;
      } catch (err) {
        if (isConditionalCheckFailed(err)) {
          guarded++;
          continue;
        }
        errors++;
        console.error(`Error updating ${name}:`, err);
      }
    }

    console.log(
      `Progress: scanned=${scanned}, removed=${removed}, skipped=${skipped}, guarded=${guarded}, errors=${errors}`,
    );
  } while (lastEvaluatedKey);

  console.log("");
  console.log("Done.");
  console.log(`  Total scanned: ${scanned}`);
  console.log(`  Removed:       ${removed}`);
  console.log(`  Skipped:       ${skipped} (no data_mode)`);
  console.log(`  Guarded:       ${guarded} (no visibility; data_mode kept)`);
  console.log(`  Errors:        ${errors}`);
  if (errors > 0) process.exit(1);
}

const tableName = process.argv[2];
if (!tableName) {
  console.error(
    "Usage: [DRY_RUN=1] npx tsx scripts/remove-product-data-mode.ts <table-name>",
  );
  console.error("  e.g. sc-staging-products, sc-prod-products");
  process.exit(1);
}

run(tableName, process.env.DRY_RUN !== undefined).catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
