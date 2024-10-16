/**
 * @file dump.ts
 * @description This file contains functions for dumping data from various sources to JSON files.
 * It includes functionality to export Ory relationships, Ory identities, and DynamoDB table contents.
 *
 * The main functions in this file are:
 * - dumpOryRelationships: Exports Ory relationship tuples to a JSON file.
 * - dumpOryIdentities: Exports Ory identities to a JSON file.
 * - dumpTable: Exports the contents of a DynamoDB table to a JSON file.
 *
 * Each function handles pagination and writes the retrieved data to a specified output directory.
 *
 * @module dump
 * @requires @aws-sdk/client-dynamodb
 * @requires @aws-sdk/util-dynamodb
 * @requires ../utils
 */

// Import necessary AWS SDK and utility functions
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import {
  ensureOutputDir,
  writeJsonFile,
  oryApiCall,
  RelationTuple,
  Identity,
  RelationTuplesResponse,
  IdentitiesResponse,
  env,
} from "../utils";

export async function dump(output: string, production: boolean): Promise<void> {
  await dumpTable("sc-accounts", output, production);
  await dumpTable("sc-repositories", output, production);
  await dumpTable("sc-api-keys", output, production);
  await dumpTable("sc-memberships", output, production);
  await dumpTable("sc-data-connections", output, production);
}

/**
 * Dumps the contents of a DynamoDB table to a JSON file.
 *
 * This function scans the entire specified DynamoDB table,
 * handling pagination to ensure all items are retrieved.
 * The items are then unmarshalled and written to a JSON file.
 *
 * @param {string} tableName - The name of the DynamoDB table to dump.
 * @param {string} output - The base output directory path.
 * @returns {Promise<void>}
 * @throws {Error} If there's an error scanning the table.
 */
export async function dumpTable(
  tableName: string,
  output: string,
  production: boolean
): Promise<void> {
  console.log(`Dumping table ${tableName}...`);
  // Ensure the output directory exists
  ensureOutputDir(output, "table");
  let client;
  if (!production) {
    client = new DynamoDBClient({ endpoint: "http://localhost:8000" });
  } else {
    client = new DynamoDBClient();
  }

  let items: unknown[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;
  try {
    // Scan the entire table, handling pagination
    do {
      const command = new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const response = await client.send(command);

      // Unmarshall and add items to the array
      if (response.Items) {
        items = items.concat(response.Items.map((item) => unmarshall(item)));
      }

      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    // Write items to a JSON file
    writeJsonFile(output, "table", `${tableName}.json`, items);
  } catch (error) {
    console.error("Error scanning table:", error);
    throw error;
  }
}
