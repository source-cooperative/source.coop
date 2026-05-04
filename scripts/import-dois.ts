#!/usr/bin/env tsx
/**
 * Import DOIs Script
 *
 * One-off script to import Digital Object Identifiers (DOIs) from dois.csv into the products table.
 *
 * @usage
 * ```bash
 * # Dry run (preview what would be updated)
 * npm run import-dois -- --csv dois.csv --stage dev --dry-run
 *
 * # For dev environment
 * npm run import-dois -- --csv dois.csv --stage dev
 *
 * # For production environment
 * npm run import-dois -- --csv dois.csv --stage prod
 * ```
 *
 * @prerequisites
 * 1. AWS Credentials: Ensure you have AWS credentials configured with access to DynamoDB
 * 2. CSV File: Provide a CSV file path with format:
 *    Source URL,DOI
 *    https://source.coop/account/product/,https://doi.org/...
 *
 * @description
 * The script:
 * 1. Reads the specified CSV file
 * 2. Parses each row to extract account_id and product_id from the Source URL
 * 3. Updates the corresponding product in DynamoDB with the DOI in metadata.doi
 * 4. Reports success/failure for each update
 *
 * @example Dry Run Mode
 * ```
 * 🔍 DRY RUN MODE - No changes will be made
 * 🚀 Importing DOIs to stage: dev
 * 📖 Reading CSV from: /path/to/dois.csv
 * Found 25 DOI mappings
 * 📝 Updating table: sc-dev-products
 * 🔍 [DRY RUN] Would update radiantearth/south-africa-crops-competition with DOI: https://doi.org/10.34911/rdnt.j0co8q
 * ...
 * ✨ Dry run complete!
 *    🔍 Products that would be updated: 25
 *    ⚠️  Products that would fail: 0
 *    📊 Total: 25
 * 💡 Run without --dry-run to apply changes
 * ```
 *
 * @example Actual Run
 * ```
 * 🚀 Importing DOIs to stage: dev
 * 📖 Reading CSV from: /path/to/dois.csv
 * Found 25 DOI mappings
 * 📝 Updating table: sc-dev-products
 * ✅ Updated radiantearth/south-africa-crops-competition with DOI: https://doi.org/10.34911/rdnt.j0co8q
 * ...
 * ✨ Import complete!
 *    ✅ Success: 25
 *    ❌ Errors: 0
 *    📊 Total: 25
 * ```
 *
 * @errorHandling
 * - If a product is not found in the database, it will be logged as an error
 * - The script continues processing remaining products even if some fail
 * - Final summary shows success/error counts
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import fs from "fs/promises";
import path from "path";

interface DOIMapping {
  sourceUrl: string;
  doi: string;
  accountId: string;
  productId: string;
}

async function parseCSV(csvPath: string): Promise<DOIMapping[]> {
  const content = await fs.readFile(csvPath, "utf-8");
  const lines = content.trim().split("\n");

  // Skip header row
  const dataLines = lines.slice(1);

  return dataLines.map((line) => {
    const [sourceUrl, doi] = line.split(",");

    // Extract account_id and product_id from URL
    // Format: https://source.coop/radiantearth/south-africa-crops-competition/
    const urlMatch = sourceUrl.match(
      /https:\/\/source\.coop\/([^\/]+)\/([^\/]+)/
    );

    if (!urlMatch) {
      throw new Error(`Failed to parse URL: ${sourceUrl}`);
    }

    const [, accountId, productId] = urlMatch;

    return {
      sourceUrl,
      doi,
      accountId,
      productId,
    };
  });
}

async function updateProductDOI(
  client: DynamoDBDocumentClient,
  tableName: string,
  mapping: DOIMapping,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    console.log(
      `🔍 [DRY RUN] Would update ${mapping.accountId}/${mapping.productId} with DOI: ${mapping.doi}`
    );
    return;
  }

  const command = new UpdateCommand({
    TableName: tableName,
    Key: {
      account_id: mapping.accountId,
      product_id: mapping.productId,
    },
    UpdateExpression: "SET metadata.doi = :doi",
    ExpressionAttributeValues: {
      ":doi": mapping.doi.trim(),
    },
    ReturnValues: "ALL_NEW",
  });

  try {
    const result = await client.send(command);
    console.log(
      `✅ Updated ${mapping.accountId}/${mapping.productId} with DOI: ${mapping.doi}`
    );
    return result.Attributes as any;
  } catch (error) {
    if ((error as any).name === "ResourceNotFoundException") {
      console.error(
        `❌ Product not found: ${mapping.accountId}/${mapping.productId}`
      );
    } else {
      console.error(
        `❌ Failed to update ${mapping.accountId}/${mapping.productId}:`,
        error
      );
    }
    throw error;
  }
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const stageIndex = args.indexOf("--stage");
  const stage = stageIndex !== -1 ? args[stageIndex + 1] : "dev";
  const csvIndex = args.indexOf("--csv");
  const csvFile = csvIndex !== -1 ? args[csvIndex + 1] : undefined;
  const dryRun = args.includes("--dry-run");

  if (!stage) {
    console.error("Error: --stage is required");
    console.error(
      "Usage: npm run import-dois -- --csv dois.csv --stage dev [--dry-run]"
    );
    process.exit(1);
  }

  if (!csvFile) {
    console.error("Error: --csv is required");
    console.error(
      "Usage: npm run import-dois -- --csv dois.csv --stage dev [--dry-run]"
    );
    process.exit(1);
  }

  if (dryRun) {
    console.log(`\n🔍 DRY RUN MODE - No changes will be made\n`);
  }

  console.log(`\n🚀 Importing DOIs to stage: ${stage}\n`);

  // Initialize DynamoDB client
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);

  // Parse CSV
  const csvPath = path.isAbsolute(csvFile)
    ? csvFile
    : path.join(process.cwd(), csvFile);
  console.log(`📖 Reading CSV from: ${csvPath}\n`);

  const mappings = await parseCSV(csvPath);
  console.log(`Found ${mappings.length} DOI mappings\n`);

  // Table name format: sc-{stage}-products
  const tableName = `sc-${stage}-products`;
  console.log(`📝 Updating table: ${tableName}\n`);

  // Update each product
  let successCount = 0;
  let errorCount = 0;

  for (const mapping of mappings) {
    try {
      await updateProductDOI(docClient, tableName, mapping, dryRun);
      successCount++;
    } catch (error) {
      errorCount++;
    }
  }

  console.log(`\n✨ ${dryRun ? "Dry run" : "Import"} complete!`);
  if (dryRun) {
    console.log(`   🔍 Products that would be updated: ${successCount}`);
    console.log(`   ⚠️  Products that would fail: ${errorCount}`);
  } else {
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
  }
  console.log(`   📊 Total: ${mappings.length}`);

  if (dryRun) {
    console.log(`\n💡 Run without --dry-run to apply changes`);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
