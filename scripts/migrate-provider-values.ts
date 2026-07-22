#!/usr/bin/env tsx
/**
 * One-time migration: rewrite legacy `DataConnection.details.provider` values to
 * the backend vocabulary — `"az" -> "azure"`, `"gcp" -> "gcs"` (see DataProvider
 * in src/types/data-connection.ts). The data proxy matches on `details.provider`
 * and only accepts the new values, so run this at/before deploying the rename.
 *
 * Dry-run by default (reports what would change without writing); pass `--apply`
 * to perform the writes. Each write is guarded by a ConditionExpression so a row
 * changed concurrently since the scan is skipped rather than clobbered. Re-runs
 * are safe: rows already on canonical values don't match an alias and are
 * skipped.
 *
 * Usage:
 *   npx tsx scripts/migrate-provider-values.ts <data-connections-table>           # dry run
 *   npx tsx scripts/migrate-provider-values.ts <data-connections-table> --apply   # write
 *
 * Examples:
 *   npx tsx scripts/migrate-provider-values.ts sc-dev-data-connections
 *   npx tsx scripts/migrate-provider-values.ts sc-prod-data-connections --apply
 *
 * Environment variables:
 *   AWS_REGION         - AWS region (default: us-east-1)
 *   AWS_PROFILE        - AWS profile to use (optional)
 *   DYNAMODB_ENDPOINT  - Override endpoint (e.g. http://localhost:8000 for local)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { DataProvider } from "@/types/data-connection";

// Legacy provider value -> canonical DataProvider value.
const ALIASES: Record<string, DataProvider> = {
  az: DataProvider.Azure,
  gcp: DataProvider.GCS,
};

interface ConnectionItem {
  data_connection_id: string;
  details?: { provider?: string };
}

async function migrate(tableName: string, apply: boolean) {
  const region = process.env.AWS_REGION || "us-east-1";
  const endpoint = process.env.DYNAMODB_ENDPOINT;
  const mapping = Object.entries(ALIASES)
    .map(([from, to]) => `"${from}"->"${to}"`)
    .join(", ");

  console.log("Migrate legacy provider values -> backend vocabulary");
  console.log(`  ${mapping}`);
  console.log(`Data connections table: ${tableName}`);
  console.log(`Region:                 ${region}`);
  if (endpoint) console.log(`Endpoint:               ${endpoint}`);
  console.log(`Mode:                   ${apply ? "APPLY (writing)" : "DRY RUN"}`);
  console.log("");

  const dbClient = new DynamoDBClient({
    region,
    ...(endpoint ? { endpoint } : {}),
  });
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
        ProjectionExpression: "data_connection_id, details",
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );
    const items = (result.Items || []) as ConnectionItem[];
    lastEvaluatedKey = result.LastEvaluatedKey;
    scanned += items.length;

    for (const item of items) {
      const from = item.details?.provider;
      const to = from ? ALIASES[from] : undefined;
      if (!to) {
        skipped++;
        continue;
      }
      const id = item.data_connection_id;

      if (!apply) {
        console.log(`[DRY RUN] Would update ${id}: provider "${from}" -> "${to}"`);
        updated++;
        continue;
      }

      try {
        await client.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { data_connection_id: id },
            // Guard against a concurrent change since the scan read it; `provider`
            // is aliased since it's a nested attribute path.
            ConditionExpression: "details.#p = :from",
            UpdateExpression: "SET details.#p = :to",
            ExpressionAttributeNames: { "#p": "provider" },
            ExpressionAttributeValues: { ":from": from, ":to": to },
          })
        );
        console.log(`Updated ${id}: provider "${from}" -> "${to}"`);
        updated++;
      } catch (err) {
        errors++;
        console.error(`Error updating ${id}:`, err);
      }
    }

    console.log(
      `Progress: scanned=${scanned}, updated=${updated}, skipped=${skipped}, errors=${errors}`
    );
  } while (lastEvaluatedKey);

  console.log("");
  console.log("Migration complete.");
  console.log(`  Total scanned: ${scanned}`);
  console.log(`  Updated:       ${updated}${apply ? "" : " (dry run)"}`);
  console.log(`  Skipped:       ${skipped}`);
  console.log(`  Errors:        ${errors}`);

  if (errors > 0) process.exit(1);
}

const tableName = process.argv[2];
const apply = process.argv.includes("--apply");

if (!tableName || tableName.startsWith("--")) {
  console.error(
    "Usage: npx tsx scripts/migrate-provider-values.ts <data-connections-table> [--apply]"
  );
  console.error("");
  console.error("Dry-run by default; pass --apply to write.");
  console.error("");
  console.error("Examples:");
  console.error(
    "  npx tsx scripts/migrate-provider-values.ts sc-dev-data-connections"
  );
  console.error(
    "  npx tsx scripts/migrate-provider-values.ts sc-prod-data-connections --apply"
  );
  console.error("");
  console.error("Environment variables:");
  console.error("  AWS_REGION         - AWS region (default: us-east-1)");
  console.error("  AWS_PROFILE        - AWS profile to use (optional)");
  console.error("  DYNAMODB_ENDPOINT  - Override endpoint (local testing)");
  process.exit(1);
}

migrate(tableName, apply).catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
