#!/usr/bin/env tsx
/**
 * One-time migration: reconcile pre-existing products with the now-enforced
 * `DataConnection.allowed_visibilities` invariant (issue #343, after #338).
 *
 * Before #338, `allowed_visibilities` was unenforced, so products could be
 * created `restricted` on the open data program connection even though that
 * connection only permits `public`/`unlisted`. This rewrites those products'
 * visibility from `restricted` -> `unlisted` (the closest permitted
 * non-public-but-accessible visibility).
 *
 * A product is migrated iff:
 *   - its primary mirror's `connection_id` is the open data connection, AND
 *   - its `visibility` is `restricted`.
 *
 * Before scanning, the target connection's `allowed_visibilities` is read and
 * asserted (`restricted` not allowed, `unlisted` allowed) so we never migrate
 * to a value that is itself disallowed.
 *
 * ponytail: scoped narrowly to the restricted-on-open-data case from the issue
 * title — the only disallowed->allowed mapping with a defined target. A general
 * "any product outside its connection's allowed set" sweep has no obvious target
 * for every case; add it when a second concrete case appears.
 *
 * Usage:
 *   npx tsx scripts/migrate-restricted-opendata-to-unlisted.ts <products-table>
 *
 * Examples:
 *   npx tsx scripts/migrate-restricted-opendata-to-unlisted.ts sc-dev-products
 *   npx tsx scripts/migrate-restricted-opendata-to-unlisted.ts sc-prod-products
 *
 * Environment variables:
 *   AWS_REGION              - AWS region (default: us-east-1)
 *   AWS_PROFILE             - AWS profile to use (optional)
 *   DYNAMODB_ENDPOINT       - Override endpoint (e.g. http://localhost:8000 for local)
 *   CONNECTION_ID           - Open data connection id (default: aws-opendata-us-west-2)
 *   DATA_CONNECTIONS_TABLE  - Data connections table name
 *                             (default: <products-table> with trailing "products"
 *                              replaced by "data-connections")
 *   DRY_RUN                 - Set (to anything) to report affected products without writing
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ProductVisibility } from "@/types/product";

const FROM = ProductVisibility.Restricted;
const TO = ProductVisibility.Unlisted;

interface ProductMirror {
  connection_id?: string;
}

interface ProductItem {
  account_id: string;
  product_id: string;
  visibility?: string;
  metadata?: {
    primary_mirror?: string;
    mirrors?: Record<string, ProductMirror>;
  };
}

/** connection_id of a product's primary mirror, or undefined if unresolvable. */
function primaryConnectionId(item: ProductItem): string | undefined {
  const key = item.metadata?.primary_mirror;
  if (!key) return undefined;
  return item.metadata?.mirrors?.[key]?.connection_id;
}

async function assertConnectionAllows(
  client: DynamoDBDocumentClient,
  tableName: string,
  connectionId: string
) {
  const { Item } = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { data_connection_id: connectionId },
    })
  );
  if (!Item) {
    throw new Error(
      `Connection "${connectionId}" not found in ${tableName}; cannot verify allowed_visibilities.`
    );
  }
  const allowed: string[] = Item.allowed_visibilities ?? [];
  console.log(
    `Connection "${connectionId}" allowed_visibilities: ${JSON.stringify(allowed)}`
  );
  if (allowed.includes(FROM)) {
    throw new Error(
      `Connection "${connectionId}" still allows "${FROM}" — migration premise is false, aborting.`
    );
  }
  if (!allowed.includes(TO)) {
    throw new Error(
      `Connection "${connectionId}" does not allow "${TO}" — would migrate to a disallowed value, aborting.`
    );
  }
}

async function migrate(productsTable: string, dryRun: boolean) {
  const region = process.env.AWS_REGION || "us-east-1";
  const endpoint = process.env.DYNAMODB_ENDPOINT;
  const connectionId = process.env.CONNECTION_ID || "aws-opendata-us-west-2";
  const dataConnectionsTable =
    process.env.DATA_CONNECTIONS_TABLE ||
    productsTable.replace(/products$/, "data-connections");

  console.log(`Migrate "${FROM}" -> "${TO}" on connection: ${connectionId}`);
  console.log(`Products table:          ${productsTable}`);
  console.log(`Data connections table:  ${dataConnectionsTable}`);
  console.log(`Region:                  ${region}`);
  if (endpoint) console.log(`Endpoint:                ${endpoint}`);
  console.log(`Dry run:                 ${dryRun}`);
  console.log("");

  const dbClient = new DynamoDBClient({ region, ...(endpoint ? { endpoint } : {}) });
  const client = DynamoDBDocumentClient.from(dbClient, {
    marshallOptions: { removeUndefinedValues: true },
  });

  // Honor the issue's note: confirm the target connection's allowed set first.
  await assertConnectionAllows(client, dataConnectionsTable, connectionId);
  console.log("");

  let lastEvaluatedKey: Record<string, unknown> | undefined;
  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: productsTable,
        ProjectionExpression: "account_id, product_id, visibility, metadata",
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );
    const items = (result.Items || []) as ProductItem[];
    lastEvaluatedKey = result.LastEvaluatedKey;
    scanned += items.length;

    for (const item of items) {
      if (
        item.visibility !== FROM ||
        primaryConnectionId(item) !== connectionId
      ) {
        skipped++;
        continue;
      }

      const id = `${item.account_id}/${item.product_id}`;

      if (dryRun) {
        console.log(`[DRY RUN] Would update ${id}: visibility ${FROM} -> ${TO}`);
        updated++;
        continue;
      }

      try {
        await client.send(
          new UpdateCommand({
            TableName: productsTable,
            Key: {
              account_id: item.account_id,
              product_id: item.product_id,
            },
            // Guard against a concurrent change since the scan read it.
            ConditionExpression: "visibility = :from",
            UpdateExpression: "SET visibility = :to",
            ExpressionAttributeValues: { ":from": FROM, ":to": TO },
          })
        );
        console.log(`Updated ${id}: visibility ${FROM} -> ${TO}`);
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
  console.log(`  Updated:       ${updated}${dryRun ? " (dry run)" : ""}`);
  console.log(`  Skipped:       ${skipped}`);
  console.log(`  Errors:        ${errors}`);
}

const productsTable = process.argv[2];

if (!productsTable) {
  console.error(
    "Usage: npx tsx scripts/migrate-restricted-opendata-to-unlisted.ts <products-table>"
  );
  console.error("");
  console.error("Examples:");
  console.error(
    "  npx tsx scripts/migrate-restricted-opendata-to-unlisted.ts sc-dev-products"
  );
  console.error(
    "  npx tsx scripts/migrate-restricted-opendata-to-unlisted.ts sc-prod-products"
  );
  console.error("");
  console.error("Environment variables:");
  console.error("  AWS_REGION              - AWS region (default: us-east-1)");
  console.error("  AWS_PROFILE             - AWS profile to use (optional)");
  console.error("  DYNAMODB_ENDPOINT       - Override endpoint (local testing)");
  console.error("  CONNECTION_ID           - Open data connection id");
  console.error("  DATA_CONNECTIONS_TABLE  - Data connections table name");
  console.error(
    "  DRY_RUN                 - Set to report affected products without writing"
  );
  process.exit(1);
}

const dryRun = process.env.DRY_RUN !== undefined;

migrate(productsTable, dryRun).catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
