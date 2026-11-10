#!/usr/bin/env tsx
/**
 * One-time migration: remove the retired `create_service_accounts` flag from
 * every account that still stores it. Service accounts no longer need the
 * flag, and `AccountFlags` no longer lists it, so an account that keeps it
 * fails validation when a client sends its flags back.
 *
 * Usage:
 *   npx tsx scripts/drop-create-service-accounts-flag.ts <accounts-table>
 *
 * Examples:
 *   DRY_RUN=1 npx tsx scripts/drop-create-service-accounts-flag.ts sc-prod-accounts
 *   npx tsx scripts/drop-create-service-accounts-flag.ts sc-prod-accounts
 *
 * Environment variables:
 *   AWS_REGION         - AWS region (default: us-east-1)
 *   AWS_PROFILE        - AWS profile to use (optional)
 *   DYNAMODB_ENDPOINT  - Override endpoint (e.g. http://localhost:8000 for local)
 *   DRY_RUN            - Set (to anything) to list affected accounts without writing
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const FLAG = "create_service_accounts";

async function migrate(table: string, dryRun: boolean) {
  const region = process.env.AWS_REGION || "us-east-1";
  const endpoint = process.env.DYNAMODB_ENDPOINT;
  console.log(`Dropping "${FLAG}" from ${table} (${region}${endpoint ? `, ${endpoint}` : ""})${dryRun ? " [DRY RUN]" : ""}`);

  const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region, ...(endpoint ? { endpoint } : {}) })
  );

  let lastEvaluatedKey: Record<string, unknown> | undefined;
  let updated = 0;
  let errors = 0;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: table,
        ProjectionExpression: "account_id, flags",
        FilterExpression: "contains(flags, :flag)",
        ExpressionAttributeValues: { ":flag": FLAG },
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );
    lastEvaluatedKey = result.LastEvaluatedKey;

    for (const { account_id, flags } of (result.Items || []) as {
      account_id: string;
      flags: string[];
    }[]) {
      const next = flags.filter((f) => f !== FLAG);
      console.log(`${dryRun ? "[DRY RUN] " : ""}${account_id}: ${JSON.stringify(flags)} -> ${JSON.stringify(next)}`);
      if (dryRun) {
        updated++;
        continue;
      }
      try {
        await client.send(
          new UpdateCommand({
            TableName: table,
            Key: { account_id },
            // Skip the write if the flags changed since the scan read them.
            ConditionExpression: "flags = :old",
            UpdateExpression: "SET flags = :new",
            ExpressionAttributeValues: { ":old": flags, ":new": next },
          })
        );
        updated++;
      } catch (err) {
        errors++;
        console.error(`Error updating ${account_id}:`, err);
      }
    }
  } while (lastEvaluatedKey);

  console.log(`Done. Updated: ${updated}${dryRun ? " (dry run)" : ""}, errors: ${errors}`);
  if (errors) process.exit(1);
}

const table = process.argv[2];
if (!table) {
  console.error("Usage: npx tsx scripts/drop-create-service-accounts-flag.ts <accounts-table>");
  process.exit(1);
}

migrate(table, process.env.DRY_RUN !== undefined).catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
