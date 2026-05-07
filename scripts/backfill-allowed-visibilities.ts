#!/usr/bin/env tsx
/**
 * Backfill script to migrate the legacy `allowed_data_modes` field to
 * `allowed_visibilities` on data-connections records, mapping legacy
 * values to ProductVisibility values along the way.
 *
 * Value mapping:
 *   "open"         -> "public"
 *   "private"      -> "restricted"
 *   "subscription" -> "restricted"
 * Values already conforming to ProductVisibility are passed through.
 *
 * For each record:
 *   - if it has `allowed_data_modes`, the values are mapped, deduped,
 *     written to `allowed_visibilities`, and `allowed_data_modes` is
 *     removed.
 *   - if it has only `allowed_visibilities`, it is skipped.
 *
 * Usage:
 *   npx tsx scripts/backfill-allowed-visibilities.ts <table-name>
 *
 * Examples:
 *   npx tsx scripts/backfill-allowed-visibilities.ts sc-dev-data-connections
 *   npx tsx scripts/backfill-allowed-visibilities.ts sc-prod-data-connections
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

const LEGACY_TO_NEW: Record<string, string> = {
  open: "public",
  private: "restricted",
  subscription: "restricted",
};

interface DataConnectionItem {
  data_connection_id: string;
  allowed_data_modes?: string[];
  allowed_visibilities?: string[];
}

function mapValues(modes: string[]): string[] {
  const mapped = modes.map((m) => LEGACY_TO_NEW[m] ?? m);
  return Array.from(new Set(mapped));
}

async function backfill(tableName: string, dryRun: boolean) {
  const region = process.env.AWS_REGION || "us-east-1";

  console.log(`Backfill allowed_visibilities for table: ${tableName}`);
  console.log(`Region: ${region}`);
  console.log(`Dry run: ${dryRun}`);
  console.log("");

  const dbClient = new DynamoDBClient({ region });
  const client = DynamoDBDocumentClient.from(dbClient, {
    marshallOptions: { removeUndefinedValues: true },
  });

  let lastEvaluatedKey: Record<string, unknown> | undefined;
  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: tableName,
        ProjectionExpression:
          "data_connection_id, allowed_data_modes, allowed_visibilities",
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );
    const items = (result.Items || []) as DataConnectionItem[];
    lastEvaluatedKey = result.LastEvaluatedKey;
    scanned += items.length;

    for (const item of items) {
      if (item.allowed_data_modes === undefined) {
        skipped++;
        continue;
      }

      const next = mapValues(item.allowed_data_modes);

      if (dryRun) {
        console.log(
          `[DRY RUN] Would update ${item.data_connection_id}: allowed_data_modes=${JSON.stringify(item.allowed_data_modes)} -> allowed_visibilities=${JSON.stringify(next)}`
        );
        updated++;
        continue;
      }

      try {
        await client.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { data_connection_id: item.data_connection_id },
            UpdateExpression:
              "SET allowed_visibilities = :allowed_visibilities REMOVE allowed_data_modes",
            ExpressionAttributeValues: { ":allowed_visibilities": next },
          })
        );
        updated++;
      } catch (err) {
        errors++;
        console.error(`Error updating ${item.data_connection_id}:`, err);
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
  console.log(`  Skipped:       ${skipped} (already migrated)`);
  console.log(`  Errors:        ${errors}`);
}

const tableName = process.argv[2];

if (!tableName) {
  console.error(
    "Usage: npx tsx scripts/backfill-allowed-visibilities.ts <table-name>"
  );
  console.error("");
  console.error("Examples:");
  console.error(
    "  npx tsx scripts/backfill-allowed-visibilities.ts sc-dev-data-connections"
  );
  console.error(
    "  npx tsx scripts/backfill-allowed-visibilities.ts sc-prod-data-connections"
  );
  console.error("");
  console.error("Environment variables:");
  console.error("  AWS_REGION  - AWS region (default: us-east-1)");
  console.error("  AWS_PROFILE - AWS profile to use (optional)");
  console.error(
    "  DRY_RUN     - Set (to anything) to preview changes without writing"
  );
  process.exit(1);
}

const dryRun = process.env.DRY_RUN !== undefined;

backfill(tableName, dryRun).catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
