#!/usr/bin/env tsx
/**
 * Give every individual account an identity binding — `(issuer, subject) ->
 * account_id` in the identity-bindings table — for its Ory identity, so the
 * app can resolve accounts through bindings and retire the `identity_id` index.
 *
 * ZERO-DOWNTIME, TWO-PHASE DESIGN
 * -------------------------------
 * The app resolves an Ory identity through its binding first and falls back to
 * the `identity_id` index for any account without one, logging the fallback.
 * A missed account is a person who cannot sign in once the fallback goes, so
 * the fallback stays until this script's verify phase says the counts match.
 *
 *   MODE=backfill (default) — ADDITIVE. Writes one binding per individual
 *     account under the given issuer. Guarded by `attribute_not_exists(issuer)`,
 *     so it is idempotent and never clobbers a binding the app already wrote.
 *
 *   MODE=verify — READ-ONLY. Counts individual accounts with an identity_id and
 *     bindings under the issuer, and exits non-zero if they differ.
 *
 * Rollout order: deploy the table + dual-read code -> run backfill -> run
 * verify -> remove the fallback and the index in a follow-up.
 *
 * Usage:
 *   npx tsx scripts/backfill-identity-bindings.ts <accounts-table> <bindings-table> <issuer>
 *
 * Examples:
 *   npx tsx scripts/backfill-identity-bindings.ts sc-dev-accounts sc-dev-identity-bindings https://auth.dev.source.coop
 *   MODE=verify npx tsx scripts/backfill-identity-bindings.ts sc-prod-accounts sc-prod-identity-bindings https://auth.source.coop
 *
 * Environment variables:
 *   MODE        - "backfill" (default, additive) or "verify" (read-only)
 *   AWS_REGION  - AWS region (default: us-east-1)
 *   AWS_PROFILE - AWS profile to use (optional)
 *   DRY_RUN     - Set (to anything) to preview backfill writes without writing
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

type Mode = "backfill" | "verify";

interface AccountItem {
  account_id: string;
  type: string;
  identity_id?: string;
  created_at?: string;
}

function isConditionalCheckFailed(err: unknown): boolean {
  return err instanceof Error && err.name === "ConditionalCheckFailedException";
}

async function* individuals(
  client: DynamoDBDocumentClient,
  accountsTable: string
): AsyncGenerator<AccountItem> {
  let lastEvaluatedKey: Record<string, unknown> | undefined;
  do {
    const result = await client.send(
      new ScanCommand({
        TableName: accountsTable,
        ProjectionExpression: "account_id, #type, identity_id, created_at",
        ExpressionAttributeNames: { "#type": "type" },
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );
    lastEvaluatedKey = result.LastEvaluatedKey;
    for (const item of (result.Items || []) as AccountItem[]) {
      if (item.type === "individual" && item.identity_id) yield item;
    }
  } while (lastEvaluatedKey);
}

async function countBindings(
  client: DynamoDBDocumentClient,
  bindingsTable: string,
  issuer: string
): Promise<number> {
  let count = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;
  do {
    const result = await client.send(
      new QueryCommand({
        TableName: bindingsTable,
        KeyConditionExpression: "issuer = :issuer",
        ExpressionAttributeValues: { ":issuer": issuer },
        Select: "COUNT",
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );
    count += result.Count ?? 0;
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  return count;
}

async function run(
  accountsTable: string,
  bindingsTable: string,
  issuer: string,
  mode: Mode,
  dryRun: boolean
) {
  const region = process.env.AWS_REGION || "us-east-1";
  console.log(`Mode:     ${mode}`);
  console.log(`Accounts: ${accountsTable}`);
  console.log(`Bindings: ${bindingsTable}`);
  console.log(`Issuer:   ${issuer}`);
  console.log(`Region:   ${region}`);
  console.log(`Dry run:  ${dryRun}`);
  console.log("");

  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
    marshallOptions: { removeUndefinedValues: true },
  });

  if (mode === "verify") {
    let accounts = 0;
    for await (const _ of individuals(client, accountsTable)) accounts++;
    const bindings = await countBindings(client, bindingsTable, issuer);
    console.log(`Individual accounts with an identity: ${accounts}`);
    console.log(`Bindings under the issuer:            ${bindings}`);
    if (accounts !== bindings) {
      console.error("MISMATCH — keep the identity_id fallback in place.");
      process.exit(1);
    }
    console.log("Counts match. The fallback can go.");
    return;
  }

  let scanned = 0;
  let written = 0;
  let guarded = 0;
  let errors = 0;
  for await (const account of individuals(client, accountsTable)) {
    scanned++;
    const binding = {
      issuer,
      subject: account.identity_id,
      account_id: account.account_id,
      created_at: account.created_at ?? new Date().toISOString(),
    };
    if (dryRun) {
      console.log(`[DRY RUN] Would bind ${account.identity_id} -> ${account.account_id}`);
      written++;
      continue;
    }
    try {
      await client.send(
        new PutCommand({
          TableName: bindingsTable,
          Item: binding,
          ConditionExpression: "attribute_not_exists(issuer)",
        })
      );
      written++;
    } catch (err) {
      if (isConditionalCheckFailed(err)) {
        // Already bound — by an earlier run or by the app at signup.
        guarded++;
        continue;
      }
      errors++;
      console.error(`Error binding ${account.account_id}:`, err);
    }
  }

  console.log("");
  console.log("backfill complete.");
  console.log(`  Individuals scanned: ${scanned}`);
  console.log(`  Bindings written:    ${written}`);
  console.log(`  Already bound:       ${guarded}`);
  console.log(`  Errors:              ${errors}`);
}

function usage() {
  console.error(
    "Usage: [MODE=backfill|verify] npx tsx scripts/backfill-identity-bindings.ts <accounts-table> <bindings-table> <issuer>"
  );
}

const [accountsTable, bindingsTable, issuer] = process.argv.slice(2);
if (!accountsTable || !bindingsTable || !issuer) {
  usage();
  process.exit(1);
}

const mode = (process.env.MODE || "backfill") as Mode;
if (mode !== "backfill" && mode !== "verify") {
  console.error(`Invalid MODE: ${mode} (expected "backfill" or "verify")`);
  usage();
  process.exit(1);
}

run(accountsTable, bindingsTable, issuer, mode, process.env.DRY_RUN !== undefined).catch(
  (err) => {
    console.error(`${mode} failed:`, err);
    process.exit(1);
  }
);
