#!/usr/bin/env tsx
/**
 * Bulk-attach `s3_web_identity_role` authentication to every S3 data connection
 * whose bucket ends with `opendata.source.coop`, pointing them all at one
 * customer-owned IAM role. The proxy assumes this role via
 * `AssumeRoleWithWebIdentity`, so no long-lived credentials are stored (see
 * S3WebIdentityRoleAuthenticationSchema in src/types/data-connection.ts).
 *
 * Run once per environment table. Staging buckets are named
 * dev.*.opendata.source.coop, so scope to them with BUCKET_PREFIX=dev. :
 *   ROLE_ARN=arn:aws:iam::123456789012:role/SourceCoopOpenData BUCKET_PREFIX=dev. \
 *     npx tsx scripts/apply-opendata-web-identity.ts sc-dev-data-connections
 *
 * Idempotent: a connection already pointing at ROLE_ARN is left untouched.
 * Any other existing authentication on a matching bucket IS overwritten — the
 * point of this script is to switch every open-data bucket onto the one role.
 *
 * Environment variables:
 *   ROLE_ARN      - IAM role ARN the proxy assumes (required)
 *   BUCKET_PREFIX - Only touch buckets starting with this (e.g. "dev." for
 *                   staging). Unset = every *.opendata.source.coop bucket.
 *   AWS_REGION    - AWS region (default: us-east-1)
 *   AWS_PROFILE   - AWS profile to use (optional)
 *   DRY_RUN       - Set (to anything) to preview changes without writing
 *
 * Self-check (no AWS calls): npx tsx scripts/apply-opendata-web-identity.ts --self-check
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const OPENDATA_SUFFIX = "opendata.source.coop";

// Mirrors IAM_ROLE_ARN_REGEX in src/types/data-connection.ts — keep in sync.
// ponytail: duplicated rather than imported to keep this one-off script free of
// the app's module graph (matches scripts/backfill-allowed-visibilities.ts).
const IAM_ROLE_ARN_REGEX =
  /^arn:aws[a-z-]*:iam::\d{12}:role\/[A-Za-z0-9+=,.@/_-]+$/;

// Bucket must end at a label boundary: "opendata.source.coop" itself or
// "<x>.opendata.source.coop", never "myopendata.source.coop". An optional
// prefix narrows further, e.g. "dev." to hit only staging's
// dev.*.opendata.source.coop buckets.
function matchesOpenDataBucket(
  bucket: string | undefined,
  prefix = "",
): boolean {
  if (!bucket) return false;
  if (prefix && !bucket.startsWith(prefix)) return false;
  return bucket === OPENDATA_SUFFIX || bucket.endsWith(`.${OPENDATA_SUFFIX}`);
}

interface DataConnectionItem {
  data_connection_id: string;
  details?: { provider?: string; bucket?: string };
  authentication?: { type?: string; role_arn?: string };
}

function isConditionalCheckFailed(err: unknown): boolean {
  return err instanceof Error && err.name === "ConditionalCheckFailedException";
}

async function apply(
  tableName: string,
  roleArn: string,
  bucketPrefix: string,
  dryRun: boolean,
) {
  const region = process.env.AWS_REGION || "us-east-1";

  console.log(`Table:    ${tableName}`);
  console.log(`Role ARN: ${roleArn}`);
  console.log(`Bucket:   ${bucketPrefix || "*"}.${OPENDATA_SUFFIX}`);
  console.log(`Region:   ${region}`);
  console.log(`Dry run:  ${dryRun}`);
  console.log("");

  const dbClient = new DynamoDBClient({ region });
  const client = DynamoDBDocumentClient.from(dbClient, {
    marshallOptions: { removeUndefinedValues: true },
  });

  const auth = { type: "s3_web_identity_role", role_arn: roleArn };

  let lastEvaluatedKey: Record<string, unknown> | undefined;
  let scanned = 0;
  let updated = 0;
  let skipped = 0; // not an open-data S3 bucket
  let already = 0; // already pointing at this role
  let errors = 0;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: tableName,
        ProjectionExpression: "data_connection_id, details, authentication",
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );
    const items = (result.Items || []) as DataConnectionItem[];
    lastEvaluatedKey = result.LastEvaluatedKey;
    scanned += items.length;

    for (const item of items) {
      if (
        item.details?.provider !== "s3" ||
        !matchesOpenDataBucket(item.details?.bucket, bucketPrefix)
      ) {
        skipped++;
        continue;
      }

      if (
        item.authentication?.type === auth.type &&
        item.authentication?.role_arn === auth.role_arn
      ) {
        already++;
        continue;
      }

      const from = item.authentication?.type ?? "(none)";
      if (dryRun) {
        console.log(
          `[DRY RUN] ${item.data_connection_id} (${item.details.bucket}): ${from} -> s3_web_identity_role`,
        );
        updated++;
        continue;
      }

      try {
        await client.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { data_connection_id: item.data_connection_id },
            UpdateExpression: "SET authentication = :auth",
            // Only touch records that still exist; PK guard keeps a deleted
            // connection from being resurrected by a racing write.
            ConditionExpression: "attribute_exists(data_connection_id)",
            ExpressionAttributeValues: { ":auth": auth },
          }),
        );
        console.log(
          `${item.data_connection_id} (${item.details.bucket}): ${from} -> s3_web_identity_role`,
        );
        updated++;
      } catch (err) {
        if (isConditionalCheckFailed(err)) {
          already++;
          continue;
        }
        errors++;
        console.error(`Error updating ${item.data_connection_id}:`, err);
      }
    }

    console.log(
      `Progress: scanned=${scanned}, updated=${updated}, already=${already}, skipped=${skipped}, errors=${errors}`,
    );
  } while (lastEvaluatedKey);

  console.log("");
  console.log("apply complete.");
  console.log(`  Total scanned: ${scanned}`);
  console.log(`  Updated:       ${updated}`);
  console.log(`  Already set:   ${already} (already on this role)`);
  console.log(`  Skipped:       ${skipped} (not an open-data S3 bucket)`);
  console.log(`  Errors:        ${errors}`);
}

function selfCheck() {
  const ok = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`self-check failed: ${msg}`);
  };
  ok(matchesOpenDataBucket("dev.us-west-2.opendata.source.coop"), "subdomain");
  ok(matchesOpenDataBucket("opendata.source.coop"), "bare suffix");
  ok(!matchesOpenDataBucket("source-coop-data"), "unrelated bucket");
  ok(!matchesOpenDataBucket("myopendata.source.coop"), "label boundary");
  ok(!matchesOpenDataBucket(undefined), "missing bucket");
  ok(
    matchesOpenDataBucket("dev.us-west-2.opendata.source.coop", "dev."),
    "prefix match",
  );
  ok(
    !matchesOpenDataBucket("prod.us-west-2.opendata.source.coop", "dev."),
    "prefix excludes prod",
  );
  ok(
    IAM_ROLE_ARN_REGEX.test("arn:aws:iam::123456789012:role/SourceCoopOpenData"),
    "valid arn",
  );
  ok(
    IAM_ROLE_ARN_REGEX.test("arn:aws-us-gov:iam::123456789012:role/path/Name"),
    "govcloud pathed arn",
  );
  ok(!IAM_ROLE_ARN_REGEX.test("arn:aws:iam::123:role/Short"), "bad account id");
  ok(!IAM_ROLE_ARN_REGEX.test("not-an-arn"), "not an arn");
  console.log("self-check passed");
}

function usage() {
  console.error(
    "Usage: ROLE_ARN=<arn> [BUCKET_PREFIX=dev.] [DRY_RUN=1] npx tsx scripts/apply-opendata-web-identity.ts <table-name>",
  );
  console.error("       npx tsx scripts/apply-opendata-web-identity.ts --self-check");
  console.error("");
  console.error("Examples:");
  console.error(
    "  # staging: only dev.*.opendata.source.coop buckets",
  );
  console.error(
    "  ROLE_ARN=arn:aws:iam::123456789012:role/SourceCoopOpenData BUCKET_PREFIX=dev. npx tsx scripts/apply-opendata-web-identity.ts sc-dev-data-connections",
  );
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

const roleArn = process.env.ROLE_ARN;
if (!roleArn) {
  console.error("ROLE_ARN is required.\n");
  usage();
  process.exit(1);
}
if (!IAM_ROLE_ARN_REGEX.test(roleArn)) {
  console.error(`Invalid ROLE_ARN: ${roleArn}`);
  process.exit(1);
}

const bucketPrefix = process.env.BUCKET_PREFIX || "";
const dryRun = process.env.DRY_RUN !== undefined;

apply(arg, roleArn, bucketPrefix, dryRun).catch((err) => {
  console.error("apply failed:", err);
  process.exit(1);
});
