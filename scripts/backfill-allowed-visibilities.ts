#!/usr/bin/env tsx
/**
 * Migrate the legacy `allowed_data_modes` field to `allowed_visibilities` on
 * data-connections records, mapping legacy values to ProductVisibility values
 * along the way.
 *
 * Value mapping:
 *   "open"         -> "public"
 *   "private"      -> "restricted"
 *   "subscription" -> "restricted"
 * Values already conforming to ProductVisibility are passed through.
 *
 * ZERO-DOWNTIME, TWO-PHASE DESIGN
 * -------------------------------
 * `allowed_data_modes` and `allowed_visibilities` are read by two independently
 * deployed services (this app and the data proxy). A single step that adds the
 * new field and drops the old one would break whichever reader is still on the
 * other version. So the migration is split so that both fields coexist for the
 * whole rollout, and the destructive removal is deferred to the very end:
 *
 *   MODE=backfill (default) — ADDITIVE. Sets `allowed_visibilities` from the
 *     mapped `allowed_data_modes` and leaves `allowed_data_modes` in place.
 *     Guarded by `attribute_not_exists(allowed_visibilities)`, so it is
 *     idempotent and never clobbers a value newer code already wrote.
 *
 *   MODE=cleanup — DESTRUCTIVE. Removes `allowed_data_modes` only. Guarded by
 *     `attribute_exists(allowed_visibilities)`, so it never strips the legacy
 *     field off a record that has no replacement. Run this ONLY after every
 *     reader (app + data proxy) has been deployed reading `allowed_visibilities`.
 *
 * Rollout order: deploy read-both code (app + proxy) -> run backfill ->
 * deploy read-new-only code (app + proxy) -> run cleanup. The backfill is safe
 * to run before or after the code deploy because both fields remain present.
 *
 * Usage:
 *   npx tsx scripts/backfill-allowed-visibilities.ts <table-name>
 *
 * Examples:
 *   npx tsx scripts/backfill-allowed-visibilities.ts sc-dev-data-connections
 *   MODE=cleanup npx tsx scripts/backfill-allowed-visibilities.ts sc-prod-data-connections
 *
 * Environment variables:
 *   MODE        - "backfill" (default, additive) or "cleanup" (destructive)
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

const LEGACY_TO_NEW: Record<string, string[]> = {
  open: ["public", "unlisted"],
  private: ["restricted"],
  subscription: ["restricted"],
};

type Mode = "backfill" | "cleanup";

interface DataConnectionItem {
  data_connection_id: string;
  allowed_data_modes?: string[];
  allowed_visibilities?: string[];
}

function mapValues(modes: string[]): string[] {
  const mapped = modes.flatMap((m) => LEGACY_TO_NEW[m] ?? m);
  return Array.from(new Set(mapped));
}

function isConditionalCheckFailed(err: unknown): boolean {
  return err instanceof Error && err.name === "ConditionalCheckFailedException";
}

async function migrate(tableName: string, mode: Mode, dryRun: boolean) {
  const region = process.env.AWS_REGION || "us-east-1";

  console.log(`Mode:    ${mode}`);
  console.log(`Table:   ${tableName}`);
  console.log(`Region:  ${region}`);
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
  // Records that matched the field-presence pre-check but failed the write's
  // ConditionExpression (e.g. already backfilled, or no new field to keep).
  let guarded = 0;
  let errors = 0;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: tableName,
        ProjectionExpression:
          "data_connection_id, allowed_data_modes, allowed_visibilities",
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );
    const items = (result.Items || []) as DataConnectionItem[];
    lastEvaluatedKey = result.LastEvaluatedKey;
    scanned += items.length;

    for (const item of items) {
      // Both phases only ever touch records that still carry the legacy field.
      // Once `allowed_data_modes` is gone, the record is fully migrated.
      if (item.allowed_data_modes === undefined) {
        skipped++;
        continue;
      }

      if (mode === "backfill") {
        // Mirror the live ConditionExpression in dry-run: only records missing
        // the new field would actually be written.
        if (item.allowed_visibilities !== undefined) {
          guarded++;
          continue;
        }
        const next = mapValues(item.allowed_data_modes);

        if (dryRun) {
          console.log(
            `[DRY RUN] Would set ${item.data_connection_id}: allowed_visibilities=${JSON.stringify(next)} (allowed_data_modes left in place)`,
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
                "SET allowed_visibilities = :allowed_visibilities",
              ConditionExpression: "attribute_not_exists(allowed_visibilities)",
              ExpressionAttributeValues: { ":allowed_visibilities": next },
            }),
          );
          updated++;
        } catch (err) {
          if (isConditionalCheckFailed(err)) {
            // A concurrent writer populated allowed_visibilities first; leave it.
            guarded++;
            continue;
          }
          errors++;
          console.error(`Error updating ${item.data_connection_id}:`, err);
        }
      } else {
        // cleanup: never strip the legacy field off a record that has no
        // replacement value yet.
        if (item.allowed_visibilities === undefined) {
          guarded++;
          continue;
        }

        if (dryRun) {
          console.log(
            `[DRY RUN] Would remove allowed_data_modes from ${item.data_connection_id}`,
          );
          updated++;
          continue;
        }

        try {
          await client.send(
            new UpdateCommand({
              TableName: tableName,
              Key: { data_connection_id: item.data_connection_id },
              UpdateExpression: "REMOVE allowed_data_modes",
              ConditionExpression: "attribute_exists(allowed_visibilities)",
            }),
          );
          updated++;
        } catch (err) {
          if (isConditionalCheckFailed(err)) {
            guarded++;
            continue;
          }
          errors++;
          console.error(`Error updating ${item.data_connection_id}:`, err);
        }
      }
    }

    console.log(
      `Progress: scanned=${scanned}, updated=${updated}, skipped=${skipped}, guarded=${guarded}, errors=${errors}`,
    );
  } while (lastEvaluatedKey);

  console.log("");
  console.log(`${mode} complete.`);
  console.log(`  Total scanned: ${scanned}`);
  console.log(`  Updated:       ${updated}`);
  console.log(`  Skipped:       ${skipped} (no allowed_data_modes)`);
  console.log(`  Guarded:       ${guarded} (condition not met)`);
  console.log(`  Errors:        ${errors}`);
}

function usage() {
  console.error(
    "Usage: [MODE=backfill|cleanup] npx tsx scripts/backfill-allowed-visibilities.ts <table-name>",
  );
  console.error("");
  console.error("Examples:");
  console.error(
    "  npx tsx scripts/backfill-allowed-visibilities.ts sc-dev-data-connections",
  );
  console.error(
    "  MODE=cleanup npx tsx scripts/backfill-allowed-visibilities.ts sc-prod-data-connections",
  );
  console.error("");
  console.error("Environment variables:");
  console.error(
    "  MODE        - 'backfill' (default, additive) or 'cleanup' (destructive)",
  );
  console.error("  AWS_REGION  - AWS region (default: us-east-1)");
  console.error("  AWS_PROFILE - AWS profile to use (optional)");
  console.error(
    "  DRY_RUN     - Set (to anything) to preview changes without writing",
  );
}

const tableName = process.argv[2];

if (!tableName) {
  usage();
  process.exit(1);
}

const mode = (process.env.MODE || "backfill") as Mode;
if (mode !== "backfill" && mode !== "cleanup") {
  console.error(`Invalid MODE: ${mode} (expected "backfill" or "cleanup")`);
  console.error("");
  usage();
  process.exit(1);
}

const dryRun = process.env.DRY_RUN !== undefined;

migrate(tableName, mode, dryRun).catch((err) => {
  console.error(`${mode} failed:`, err);
  process.exit(1);
});
