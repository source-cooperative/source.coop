#!/usr/bin/env tsx
/**
 * Seed the tag corpus with every tag products already carry, so the product
 * form can offer them. Additive and idempotent: it only puts tags, never
 * removes one, and a tag already present is rewritten unchanged.
 *
 * Usage:
 *   npx tsx scripts/seed-tags.ts <stage>
 *
 * Examples:
 *   DRY_RUN=1 npx tsx scripts/seed-tags.ts prod
 *   npx tsx scripts/seed-tags.ts dev
 *
 * Environment variables:
 *   AWS_REGION  - AWS region (default: us-east-1)
 *   AWS_PROFILE - AWS profile to use (optional)
 *   DRY_RUN     - Set (to anything) to list the tags without writing
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

const stage = process.argv[2];
if (!stage) {
  console.error("Usage: npx tsx scripts/seed-tags.ts <stage>");
  process.exit(1);
}

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" })
);

async function main() {
  const tags = new Set<string>();
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const page = await client.send(
      new ScanCommand({
        TableName: `sc-${stage}-products`,
        ProjectionExpression: "metadata.tags",
        ExclusiveStartKey,
      })
    );
    for (const item of page.Items ?? []) {
      for (const tag of item.metadata?.tags ?? []) tags.add(tag);
    }
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  console.log(`${tags.size} distinct tags:`, [...tags].sort().join(", "));
  if (process.env.DRY_RUN) return;

  for (const tag_id of tags) {
    await client.send(
      new PutCommand({ TableName: `sc-${stage}-tags`, Item: { tag_id } })
    );
  }
  console.log(`Wrote ${tags.size} tags to sc-${stage}-tags`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
