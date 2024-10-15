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

/**
 * Dumps Ory relationships to a JSON file.
 *
 * This function fetches all relationship tuples from the Ory API,
 * potentially making multiple API calls to handle pagination.
 * The retrieved relationships are then written to a JSON file.
 *
 * @param {string} output - The base output directory path.
 * @returns {Promise<void>}
 */
export async function dumpOryRelationships(output: string): Promise<void> {
  // Ensure the output directory exists
  ensureOutputDir(output, "ory");

  const relationships: RelationTuple[] = [];
  let nextPage: string | null = null;

  // Fetch all relationship tuples, handling pagination
  do {
    const data: RelationTuplesResponse =
      await oryApiCall<RelationTuplesResponse>("/relation-tuples", nextPage);
    relationships.push(...data.relation_tuples);
    nextPage = data.next_page_token;
  } while (nextPage);

  // Write relationships to a JSON file
  writeJsonFile(output, "ory", "relationships.json", relationships);
}

/**
 * Dumps Ory identities to a JSON file.
 *
 * This function fetches all identities from the Ory API,
 * handling pagination through the Link header. The retrieved
 * identities are then mapped by their ID and written to a JSON file.
 *
 * @param {string} output - The base output directory path.
 * @returns {Promise<void>}
 */
export async function dumpOryIdentities(output: string): Promise<void> {
  // Ensure the output directory exists
  ensureOutputDir(output, "ory");

  const identities: Identity[] = [];
  let nextPageUrl: string | null = `/admin/identities`;

  // Fetch all identities, handling pagination through Link header
  while (nextPageUrl) {
    const response: Response = await fetch(`${env.ORY_SDK_URL}${nextPageUrl}`, {
      headers: { Authorization: `Bearer ${env.ORY_ACCESS_TOKEN}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch identities: ${response.statusText}`);
    }

    const data: IdentitiesResponse = await response.json();
    identities.push(...data);

    // Parse the Link header to get the next page URL
    const linkHeader: string | null = response.headers.get("link");
    if (linkHeader) {
      const links: string[] = linkHeader.split(",");
      const nextLink: string | undefined = links.find((link: string) =>
        link.includes('rel="next"')
      );
      nextPageUrl = nextLink
        ? nextLink.split(";")[0].trim().slice(1, -1)
        : null;
    } else {
      nextPageUrl = null;
    }
  }

  // Create a map of identities by their ID
  const identitiesMap: Record<string, Identity> = Object.fromEntries(
    identities.map((identity) => [identity.id, identity])
  );

  // Write identities map to a JSON file
  writeJsonFile(output, "ory", "identities.json", identitiesMap);
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
  output: string
): Promise<void> {
  // Ensure the output directory exists
  ensureOutputDir(output, "table");

  const client = new DynamoDBClient();
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
    console.log(`Scan complete. ${items.length} items written.`);
  } catch (error) {
    console.error("Error scanning table:", error);
    throw error;
  }
}
