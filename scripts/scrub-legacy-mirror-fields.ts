#!/usr/bin/env tsx
/**
 * One-time cleanup: drop the `storage_type` and `config` attributes that the
 * legacy DynamoDB migration wrote onto every product mirror (issue #513).
 *
 * `scripts/load-dynamodb-exports.ts` stamped a hardcoded
 * `{ storage_type: "s3", config: { region: "us-west-2", bucket:
 * "aws-opendata-us-west-2" } }` onto every mirror it converted, regardless of
 * where the product's data actually lives — and `bucket` there is a connection
 * id, not a bucket name. Neither attribute is in `ProductMirrorSchema`, and no
 * consumer reads them: the data proxy deserializes only `connection_id`/`prefix`
 * and resolves the bucket from the connection record, this app never references
 * them, and metadata-catalog-pipeline reads only `is_primary`/`connection_id`/
 * `prefix`. They are inert, but they are copied verbatim into published catalog
 * records, where they read as authoritative routing config and send anyone
 * debugging a mirror problem to the wrong bucket. This removes them.
 *
 * Usage:
 *   npx tsx scripts/scrub-legacy-mirror-fields.ts <products-table>
 *   npx tsx scripts/scrub-legacy-mirror-fields.ts --self-check
 *
 * Examples:
 *   DRY_RUN=1 npx tsx scripts/scrub-legacy-mirror-fields.ts sc-dev-products
 *   npx tsx scripts/scrub-legacy-mirror-fields.ts sc-prod-products
 *
 * Environment variables:
 *   AWS_REGION         - AWS region (default: us-east-1)
 *   AWS_PROFILE        - AWS profile to use (optional)
 *   DYNAMODB_ENDPOINT  - Override endpoint (e.g. http://localhost:8000 for local)
 *   DRY_RUN            - Set (to anything) to report affected products without writing
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

// The attributes the migration invented. Not in ProductMirrorSchema.
const LEGACY_MIRROR_FIELDS = ["storage_type", "config"] as const;

interface ProductItem {
  account_id: string;
  product_id: string;
  metadata?: {
    mirrors?: Record<string, Record<string, unknown>>;
  };
}

interface RemovalPlan {
  /** `REMOVE` clause listing every legacy attribute on every mirror. */
  updateExpression: string;
  /** Mirror keys are arbitrary strings (hyphens, dots), so they must be aliased. */
  names: Record<string, string>;
  /** For logging: "mirror-key.storage_type" per attribute removed. */
  removed: string[];
}

/**
 * The REMOVE plan for one product, or null when it carries no legacy attributes.
 *
 * Attribute *names* are aliased (`#m0`), but the `metadata`/`mirrors` path
 * segments are literal — neither is a DynamoDB reserved word.
 */
export function planRemoval(item: ProductItem): RemovalPlan | null {
  const mirrors = item.metadata?.mirrors;
  if (!mirrors) return null;

  const clauses: string[] = [];
  const names: Record<string, string> = {};
  const removed: string[] = [];

  for (const [i, [mirrorKey, mirror]] of Object.entries(mirrors).entries()) {
    const present = LEGACY_MIRROR_FIELDS.filter((f) => f in mirror);
    if (present.length === 0) continue;

    const mirrorAlias = `#m${i}`;
    names[mirrorAlias] = mirrorKey;

    for (const field of present) {
      const fieldAlias = `#f${i}_${field}`;
      names[fieldAlias] = field;
      clauses.push(`metadata.mirrors.${mirrorAlias}.${fieldAlias}`);
      removed.push(`${mirrorKey}.${field}`);
    }
  }

  if (clauses.length === 0) return null;
  return { updateExpression: `REMOVE ${clauses.join(", ")}`, names, removed };
}

async function scrub(productsTable: string, dryRun: boolean) {
  const region = process.env.AWS_REGION || "us-east-1";
  const endpoint = process.env.DYNAMODB_ENDPOINT;

  console.log(`Scrub legacy mirror fields: ${LEGACY_MIRROR_FIELDS.join(", ")}`);
  console.log(`Products table:  ${productsTable}`);
  console.log(`Region:          ${region}`);
  if (endpoint) console.log(`Endpoint:        ${endpoint}`);
  console.log(`Dry run:         ${dryRun}`);
  console.log("");

  const dbClient = new DynamoDBClient({
    region,
    ...(endpoint ? { endpoint } : {}),
  });
  const client = DynamoDBDocumentClient.from(dbClient);

  let lastEvaluatedKey: Record<string, unknown> | undefined;
  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: productsTable,
        ProjectionExpression: "account_id, product_id, metadata",
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );
    const items = (result.Items || []) as ProductItem[];
    lastEvaluatedKey = result.LastEvaluatedKey;
    scanned += items.length;

    for (const item of items) {
      const plan = planRemoval(item);
      if (!plan) {
        skipped++;
        continue;
      }

      const id = `${item.account_id}/${item.product_id}`;
      const what = plan.removed.join(", ");

      if (dryRun) {
        console.log(`[DRY RUN] Would remove from ${id}: ${what}`);
        updated++;
        continue;
      }

      try {
        // ponytail: no condition expression. REMOVE of a specific nested path
        // cannot clobber a concurrent edit to any other attribute, and removing
        // an already-absent path is a no-op, so the write is idempotent and safe
        // to re-run against a table someone else is editing.
        await client.send(
          new UpdateCommand({
            TableName: productsTable,
            Key: {
              account_id: item.account_id,
              product_id: item.product_id,
            },
            UpdateExpression: plan.updateExpression,
            ExpressionAttributeNames: plan.names,
          })
        );
        console.log(`Updated ${id}: removed ${what}`);
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
  console.log("Scrub complete.");
  console.log(`  Total scanned: ${scanned}`);
  console.log(`  Updated:       ${updated}${dryRun ? " (dry run)" : ""}`);
  console.log(`  Skipped:       ${skipped} (nothing to remove)`);
  console.log(`  Errors:        ${errors}`);
}

function selfCheck() {
  const ok = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`self-check failed: ${msg}`);
  };

  const legacy = {
    account_id: "a",
    product_id: "p",
    metadata: {
      mirrors: {
        "aws-opendata-ap-south-1": {
          storage_type: "s3",
          connection_id: "aws-opendata-ap-south-1",
          prefix: "a/p/",
          is_primary: true,
          config: { region: "us-west-2", bucket: "aws-opendata-us-west-2" },
        },
      },
    },
  };
  const plan = planRemoval(legacy);
  ok(plan !== null, "legacy mirror produces a plan");
  ok(plan!.removed.length === 2, "both attributes removed");
  ok(
    plan!.updateExpression ===
      "REMOVE metadata.mirrors.#m0.#f0_storage_type, metadata.mirrors.#m0.#f0_config",
    `expression shape (got: ${plan!.updateExpression})`
  );
  ok(
    plan!.names["#m0"] === "aws-opendata-ap-south-1",
    "mirror key is aliased, not inlined"
  );
  ok(plan!.names["#f0_config"] === "config", "field name is aliased");

  // A clean mirror (post-migration product) must not be written at all.
  ok(
    planRemoval({
      account_id: "a",
      product_id: "p",
      metadata: {
        mirrors: {
          "aws-opendata-us-west-2": {
            connection_id: "aws-opendata-us-west-2",
            prefix: "a/p/",
            is_primary: true,
          },
        },
      },
    }) === null,
    "clean product is skipped"
  );

  ok(planRemoval({ account_id: "a", product_id: "p" }) === null, "no metadata");
  ok(
    planRemoval({ account_id: "a", product_id: "p", metadata: {} }) === null,
    "no mirrors"
  );
  ok(
    planRemoval({
      account_id: "a",
      product_id: "p",
      metadata: { mirrors: {} },
    }) === null,
    "empty mirrors map"
  );

  // Only one of the two attributes present: remove just that one.
  const partial = planRemoval({
    account_id: "a",
    product_id: "p",
    metadata: {
      mirrors: { m: { storage_type: "s3", connection_id: "c", prefix: "a/p/" } },
    },
  });
  ok(partial !== null, "partial legacy mirror produces a plan");
  ok(partial!.removed.length === 1, "only the present attribute is removed");

  // Multiple mirrors, only some dirty — aliases must not collide across them.
  const multi = planRemoval({
    account_id: "a",
    product_id: "p",
    metadata: {
      mirrors: {
        "conn-a": { storage_type: "s3", connection_id: "conn-a" },
        "conn-b": { connection_id: "conn-b" },
        "conn-c": { config: {}, connection_id: "conn-c" },
      },
    },
  });
  ok(multi !== null, "multi-mirror plan");
  ok(multi!.removed.length === 2, "only dirty mirrors contribute removals");
  ok(
    new Set(Object.values(multi!.names)).size ===
      Object.keys(multi!.names).length,
    "no alias collisions across mirrors"
  );
  ok(multi!.names["#m0"] === "conn-a", "index tracks position, not dirty count");
  ok(multi!.names["#m2"] === "conn-c", "third mirror keeps its own index");

  console.log("self-check passed");
}

function usage() {
  console.error(
    "Usage: [DRY_RUN=1] npx tsx scripts/scrub-legacy-mirror-fields.ts <products-table>"
  );
  console.error(
    "       npx tsx scripts/scrub-legacy-mirror-fields.ts --self-check"
  );
  console.error("");
  console.error("Examples:");
  console.error(
    "  DRY_RUN=1 npx tsx scripts/scrub-legacy-mirror-fields.ts sc-dev-products"
  );
  console.error(
    "  npx tsx scripts/scrub-legacy-mirror-fields.ts sc-prod-products"
  );
  console.error("");
  console.error("Environment variables:");
  console.error("  AWS_REGION         - AWS region (default: us-east-1)");
  console.error("  AWS_PROFILE        - AWS profile to use (optional)");
  console.error("  DYNAMODB_ENDPOINT  - Override endpoint (local testing)");
  console.error("  DRY_RUN            - Set to report changes without writing");
}

const arg = process.argv[2];

if (arg === "--self-check") {
  selfCheck();
  process.exit(0);
}

if (!arg) {
  usage();
  process.exit(1);
}

scrub(arg, process.env.DRY_RUN !== undefined).catch((err) => {
  console.error("Scrub failed:", err);
  process.exit(1);
});
