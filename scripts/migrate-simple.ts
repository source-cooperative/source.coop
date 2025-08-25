#!/usr/bin/env tsx

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  DynamoDBClient as DynamoDBClientV3,
  ListExportsCommand,
} from "@aws-sdk/client-dynamodb";
import { fromIni } from "@aws-sdk/credential-providers";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import * as zlib from "zlib";
import * as readline from "readline";

// Simple configuration - just the essentials
interface MigrationConfig {
  tableName: string;
  stage: string;
  sourceProfile: string;
  targetProfile: string;
  sourceAccountId: string; // Hardcoded to 939788573396
}

// Product conversion function (for repository tables)
function convertRepositoryToProduct(oldProduct: any) {
  const now = new Date().toISOString();

  // Convert mirrors to new format
  const mirrors: Record<string, any> = {};
  for (const [key, mirror] of Object.entries(oldProduct.data.mirrors)) {
    const mirrorData = mirror as any;
    mirrors[key] = {
      storage_type: "s3",
      connection_id: mirrorData.data_connection_id,
      prefix: mirrorData.prefix,
      config: {
        region: "us-west-2",
        bucket: "aws-opendata-us-west-2",
      },
      is_primary: key === oldProduct.data.primary_mirror,
    };
  }

  // Create default role for the owner
  const roles: Record<string, any> = {
    [oldProduct.account_id]: {
      account_id: oldProduct.account_id,
      role: "admin",
      granted_at: now,
      granted_by: oldProduct.account_id,
    },
  };

  // Convert visibility based on old fields
  const visibility =
    oldProduct.data_mode === "open"
      ? oldProduct.state === "listed"
        ? "public"
        : "unlisted"
      : "restricted";

  const result = {
    product_id: oldProduct.repository_id, // This is the primary key!
    account_id: oldProduct.account_id,
    title: oldProduct.meta.title,
    description: oldProduct.meta.description || "",
    created_at: oldProduct.published,
    updated_at: now,
    disabled: oldProduct.disabled,
    data_mode: oldProduct.data_mode,
    visibility,
    featured: Number(oldProduct.featured),
    metadata: {
      mirrors,
      primary_mirror: oldProduct.data.primary_mirror,
      tags: oldProduct.meta.tags.map((tag: any) => tag["S"]) || [],
      roles,
    },
  };

  // Clean any undefined values before returning
  return removeUndefinedValues(result);
}

// Utility function to remove undefined values recursively
function removeUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedValues).filter((item) => item !== undefined);
  }

  if (typeof obj === "object") {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value);
      }
    }
    return cleaned;
  }

  return obj;
}

// Account conversion function (for account tables)
function convertAccountToNewSchema(oldAccount: any) {
  const now = new Date().toISOString();

  // Determine account type
  const accountType =
    oldAccount.account_type === "user" ? "individual" : "organization";

  // Convert profile data
  const profile = oldAccount.profile || {};

  // Build emails array
  const emails = [];
  if (profile.email) {
    emails.push({
      address: profile.email,
      verified: false, // Will need to be verified in new system
      is_primary: true,
      added_at: now,
    });
  }

  // Ensure at least one email exists (use account_id as fallback)
  if (emails.length === 0) {
    // emails.push({
    //   address: `${oldAccount.account_id}@placeholder.source.coop`,
    //   verified: false,
    //   is_primary: true,
    //   added_at: now,
    // });
  }

  // Build metadata_public object, only including defined values
  const metadata_public: any = {
    domains: [], // Initialize empty array
  };

  if (profile.bio) metadata_public.bio = profile.bio;
  if (profile.location) metadata_public.location = profile.location;
  if (profile.url)
    metadata_public.domains.push({
      domain: profile.url,
      created_at: now,
      status: "unverified",
    });

  // Convert flags from DynamoDB attribute format to simple strings
  const flags = (oldAccount.flags || [])
    .map((flag: any) => {
      if (typeof flag === "string") return flag;
      if (flag && typeof flag === "object" && flag.S) return flag.S;
      return flag; // fallback for unexpected formats
    })
    .filter(Boolean);

  const result = {
    account_id: oldAccount.account_id,
    type: accountType,
    name: profile.name || oldAccount.account_id,
    emails,
    created_at: now,
    updated_at: now,
    disabled: oldAccount.disabled || false,
    flags,
    metadata_public,
    metadata_private: {},
    identity_id: oldAccount.identity_id,
  };

  // Clean any undefined values before returning
  return removeUndefinedValues(result);
}

// Find the most recent export for a table
async function findMostRecentExport(
  dynamoClient: DynamoDBClientV3,
  tableName: string,
  region: string,
  sourceAccountId: string
): Promise<{ exportArn: string; exportTime: Date; s3Prefix: string } | null> {
  try {
    console.log(
      `   Looking for exports for table: ${tableName} in region: ${region}`
    );

    // Try TableArn approach first
    const tableArn = `arn:aws:dynamodb:${region}:${sourceAccountId}:table/${tableName}`;
    console.log(`   Trying TableArn approach: ${tableArn}`);

    try {
      const response = await dynamoClient.send(
        new ListExportsCommand({
          TableArn: tableArn,
        })
      );

      if (response.ExportSummaries && response.ExportSummaries.length > 0) {
        console.log(
          `   Found ${response.ExportSummaries.length} exports using TableArn`
        );

        // Filter exports for completed status only
        const completedExports = response.ExportSummaries.filter(
          (exportSummary) => exportSummary.ExportStatus === "COMPLETED"
        );

        if (completedExports.length > 0) {
          return processExports(completedExports, tableName);
        }
      }
    } catch (tableArnError) {
      console.log(`TableArn approach failed: ${tableArnError}`);
      console.log("Falling back to listing all exports...");
    }

    // Fallback: list all exports and filter by table name
    console.log("Listing all exports and filtering by table name...");
    const response = await dynamoClient.send(new ListExportsCommand({}));

    if (!response.ExportSummaries) {
      console.log("No exports found");
      return null;
    }

    console.log(`Found ${response.ExportSummaries.length} total exports`);

    // Debug: show all exports
    response.ExportSummaries.forEach((exportSummary, index) => {
      console.log(
        `Export ${index + 1}: ${exportSummary.ExportArn} - Status: ${
          exportSummary.ExportStatus
        }`
      );
    });

    // Filter exports for this table and completed status
    const tableExports = response.ExportSummaries.filter((exportSummary) => {
      const includesTable = exportSummary.ExportArn?.includes(tableName);
      const isCompleted = exportSummary.ExportStatus === "COMPLETED";
      console.log(`Checking export: ${exportSummary.ExportArn}`);
      console.log(`   - Includes table '${tableName}': ${includesTable}`);
      console.log(`   - Status is COMPLETED: ${isCompleted}`);
      return includesTable && isCompleted;
    });

    console.log(
      `Found ${tableExports.length} matching exports for table ${tableName}`
    );

    if (tableExports.length === 0) {
      console.log("No completed exports found for this table");
      return null;
    }

    return processExports(tableExports, tableName);
  } catch (error) {
    console.error(`Error finding exports for table ${tableName}:`, error);
    throw error;
  }
}

// Helper function to process and sort exports
function processExports(
  exports: any[],
  tableName: string
): { exportArn: string; exportTime: Date; s3Prefix: string } {
  // Sort by timestamp extracted from ExportArn
  exports.sort((a, b) => {
    const timestampA = a.ExportArn?.split("/export/")[1]?.split("-")[0] || "0";
    const timestampB = b.ExportArn?.split("/export/")[1]?.split("-")[0] || "0";
    return parseInt(timestampB, 10) - parseInt(timestampA, 10);
  });

  const mostRecent = exports[0];
  const timestamp =
    mostRecent.ExportArn?.split("/export/")[1]?.split("-")[0] || "0";
  const exportTime = new Date(parseInt(timestamp, 10));

  // Derive S3 prefix from export ARN
  const s3Prefix = `${tableName.replace(
    "sc-",
    ""
  )}/AWSDynamoDB/${timestamp}-${mostRecent.ExportArn?.split("-").pop()}`;

  return {
    exportArn: mostRecent.ExportArn!,
    exportTime,
    s3Prefix,
  };
}

// Helper function to process individual data files
async function processDataFile(dataBody: any): Promise<any[]> {
  const items: any[] = [];

  // Stream and process the gzipped data
  const dataStream = dataBody.transformToWebStream();
  const gunzip = zlib.createGunzip();

  // Use brace counting to find complete JSON objects
  return new Promise((resolve, reject) => {
    let buffer = "";
    let parseSuccessCount = 0;
    let parseErrorCount = 0;

    gunzip.on("data", (chunk) => {
      buffer += chunk.toString();
      processBuffer();
    });

    function processBuffer() {
      let braceCount = 0;
      let startIndex = -1;

      for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] === "{") {
          if (braceCount === 0) {
            startIndex = i;
          }
          braceCount++;
        } else if (buffer[i] === "}") {
          braceCount--;
          if (braceCount === 0 && startIndex !== -1) {
            // Complete JSON object found
            const jsonStr = buffer.substring(startIndex, i + 1);

            try {
              const item = JSON.parse(jsonStr);
              if (item.Item) {
                const parsedItem = parseDynamoDBItem(item.Item);
                if (parsedItem) {
                  items.push(parsedItem);
                  parseSuccessCount++;
                }
              }
            } catch (parseError) {
              parseErrorCount++;
              if (parseErrorCount <= 3) {
                // Show first 3 errors only
                const errorMessage =
                  parseError instanceof Error
                    ? parseError.message
                    : String(parseError);
                console.warn(`Parse error ${parseErrorCount}: ${errorMessage}`);
              }
            }

            // Remove processed JSON from buffer
            buffer = buffer.substring(i + 1);
            i = -1; // Reset index since we modified the buffer
            startIndex = -1;
          }
        }
      }
    }

    gunzip.on("end", () => {
      console.log(`\n📊 Parse Results:`);
      console.log(`   Successful parses: ${parseSuccessCount}`);
      console.log(`   Parse errors: ${parseErrorCount}`);
      console.log(`   Total items extracted: ${items.length}`);
      console.log(`   Buffer remaining: ${buffer.length} characters`);

      resolve(items);
    });

    gunzip.on("error", reject);

    // Pipe the data through gunzip
    pipeline(Readable.from(dataStream as any), gunzip).catch(reject);
  });
}

// Process S3 export data
async function processS3Export(
  s3Client: S3Client,
  bucket: string,
  prefix: string,
  isRepositoryTable: boolean
): Promise<any[]> {
  const manifestKey = `${prefix}/manifest-files.json`;

  try {
    // Read manifest
    const manifestResponse = await s3Client.send(
      new GetObjectCommand({ Bucket: bucket, Key: manifestKey })
    );

    if (!manifestResponse.Body) {
      throw new Error("Manifest body is empty");
    }

    const manifestText = await manifestResponse.Body.transformToString();
    console.log(
      `   Manifest content preview: ${manifestText.substring(0, 200)}...`
    );

    // Handle JSONL format (multiple JSON objects on separate lines)
    const manifests = manifestText
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const items: any[] = [];

    // Single data file format
    for (const manifest of manifests) {
      console.log(`\nProcessing manifest with ${manifest.itemCount} items...`);
      const dataResponse = await s3Client.send(
        new GetObjectCommand({ Bucket: bucket, Key: manifest.dataFileS3Key })
      );

      if (!dataResponse.Body) {
        throw new Error("Data file body is empty");
      }

      // Process the data file
      const fileItems = await processDataFile(dataResponse.Body);
      items.push(...fileItems);
    }

    return items;
  } catch (error) {
    console.error("Error processing S3 export:", error);
    throw error;
  }
}

// Parse DynamoDB item format
function parseDynamoDBItem(item: any): any {
  const result: any = {};

  for (const [key, value] of Object.entries(item)) {
    if (value && typeof value === "object" && "S" in value) {
      result[key] = value.S;
    } else if (value && typeof value === "object" && "N" in value) {
      result[key] = value.N;
    } else if (value && typeof value === "object" && "BOOL" in value) {
      result[key] = value.BOOL;
    } else if (value && typeof value === "object" && "M" in value) {
      result[key] = parseDynamoDBItem(value.M);
    } else if (
      value &&
      typeof value === "object" &&
      "L" in value &&
      Array.isArray(value.L)
    ) {
      result[key] = value.L.map((item) =>
        item && typeof item === "object" && "S" in item
          ? item.S
          : item && typeof item === "object" && "N" in item
          ? item.N
          : item && typeof item === "object" && "BOOL" in item
          ? item.BOOL
          : item
      );
    } else if (
      value &&
      typeof value === "object" &&
      "NULL" in value &&
      value.NULL === true
    ) {
      result[key] = null;
    } else {
      result[key] = value;
    }
  }

  return result;
}

// Write items to DynamoDB
async function writeToDynamoDB(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  items: any[]
) {
  const batchSize = 25;
  const batches = [];

  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  console.log(`Writing ${items.length} items in ${batches.length} batches...`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const writeRequests = batch.map((item) => {
      return { PutRequest: { Item: item } };
    });

    try {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: { [tableName]: writeRequests },
        })
      );
      console.log(`Batch ${i + 1}/${batches.length} completed`);
    } catch (error) {
      console.error(`Batch ${i + 1} failed:`, error);
      throw error;
    }
  }
}

// Main migration function
async function migrateTable(config: MigrationConfig) {
  const { tableName, stage, sourceProfile, targetProfile, sourceAccountId } =
    config;

  // Determine target table name and region
  const isRepositoryTable = tableName.endsWith("-repositories");
  const isAccountTable = tableName.endsWith("-accounts");
  const targetTableName = isRepositoryTable
    ? `sc-${stage}-products`
    : `sc-${stage}-${tableName.replace("sc-", "")}`;

  const targetRegion = stage === "prod" ? "us-west-2" : "us-east-1";
  const sourceRegion = "us-west-2";
  const sourceBucket = "source-table-exports-us-west-2";

  console.log(`\n🚀 Starting migration...`);
  console.log(`   Source:`);
  console.log(`     Profile: ${sourceProfile}`);
  console.log(`     Region: ${sourceRegion}`);
  console.log(`     Table: ${tableName}`);
  console.log(`   Target:`);
  console.log(`     Profile: ${targetProfile}`);
  console.log(`     Region: ${targetRegion}`);
  console.log(`     Table: ${targetTableName}`);

  if (isRepositoryTable) {
    console.log(
      `    ⚠️  Repository table detected - will convert to product format`
    );
  }

  if (isAccountTable) {
    console.log(
      `    ⚠️  Account table detected - will convert to new schema format`
    );
  }

  // Initialize clients
  const sourceS3Client = new S3Client({
    region: sourceRegion,
    credentials: fromIni({ profile: sourceProfile }),
  });

  const sourceDynamoClient = new DynamoDBClientV3({
    region: sourceRegion,
    credentials: fromIni({ profile: sourceProfile }),
  });

  const targetDynamoClient = new DynamoDBClient({
    region: targetRegion,
    credentials: fromIni({ profile: targetProfile }),
  });

  const targetDocClient = DynamoDBDocumentClient.from(targetDynamoClient);

  try {
    // Find most recent export
    console.log(`\n🔍 Searching for most recent export...`);
    const exportInfo = await findMostRecentExport(
      sourceDynamoClient,
      tableName,
      sourceRegion,
      sourceAccountId
    );

    if (!exportInfo) {
      throw new Error(`No exports found for table: ${tableName}`);
    }

    console.log(`✅ Found export from ${exportInfo.exportTime.toISOString()}`);
    console.log(`    S3 Prefix: ${exportInfo.s3Prefix}`);

    // Process S3 export
    console.log(`\n📥 Processing S3 export...`);
    let items = await processS3Export(
      sourceS3Client,
      sourceBucket,
      exportInfo.s3Prefix,
      isRepositoryTable
    );

    if (items.length === 0) {
      console.log("No items found to migrate");
      return;
    }

    if (isRepositoryTable) {
      items = items.map(convertRepositoryToProduct);
    }

    if (isAccountTable) {
      items = items.map(convertAccountToNewSchema);
    }

    console.log(`✅ Processed ${items.length} items`);

    // Debug: Show first item before processing
    console.log(`\n🔍 First item structure:`);
    console.log(JSON.stringify(items[0], null, 2));

    // Ask for confirmation
    const confirmed = await confirmMigration(
      tableName,
      sourceRegion,
      stage,
      targetTableName,
      targetRegion,
      items.length
    );
    if (!confirmed) {
      console.log("❌ Migration cancelled by user");
      return;
    }

    // Write to DynamoDB (function handles repository conversion internally)
    await writeToDynamoDB(targetDocClient, targetTableName, items);

    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`    ${items.length} items migrated to ${targetTableName}`);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  }
}

// Confirmation prompt
async function confirmMigration(
  tableName: string,
  sourceRegion: string,
  stage: string,
  targetTable: string,
  targetRegion: string,
  itemCount: number
): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`\n⚠️  Migration Summary:`);
  console.log(`   Source: ${tableName} (${sourceRegion})`);
  console.log(`   Target: ${targetTable} (${targetRegion})`);
  console.log(`   Items: ${itemCount}`);
  console.log(`   Stage: ${stage}`);

  return new Promise((resolve) => {
    rl.question(
      "\nDo you want to proceed with this migration? (y/N): ",
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
      }
    );
  });
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 4) {
    console.log(
      "Usage: npm run migrate <table-name> <stage> <source-profile> <target-profile>"
    );
    console.log("");
    console.log("Examples:");
    console.log("  npm run migrate sc-accounts dev radiantearth source-proxy");
    console.log(
      "  npm run migrate sc-repositories prod radiantearth source-proxy"
    );
    console.log("");
    console.log("Arguments:");
    console.log(
      "  table-name        Source table (e.g., sc-accounts, sc-repositories)"
    );
    console.log("  stage             Target stage (dev or prod)");
    console.log("  source-profile    AWS profile for SOURCE account (exports)");
    console.log("  target-profile    AWS profile for TARGET account (tables)");
    console.log("");
    console.log("Stages:");
    console.log("  dev  -> Development (us-east-1)");
    console.log("  prod -> Production (us-west-2)");
    process.exit(1);
  }

  const [tableName, stage, sourceProfile, targetProfile] = args;

  if (!["dev", "prod"].includes(stage)) {
    console.error('Error: Stage must be "dev" or "prod"');
    process.exit(1);
  }

  const config: MigrationConfig = {
    tableName,
    stage,
    sourceProfile,
    targetProfile,
    sourceAccountId: "939788573396", // Hardcoded source account ID
  };

  try {
    await migrateTable(config);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
