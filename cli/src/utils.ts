import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// Environment variable schema
const envSchema = z.object({
  ORY_SDK_URL: z.optional(z.string().url()),
  ORY_ACCESS_TOKEN: z.optional(z.string()),
  ENDPOINT_URL: z.optional(z.string().url()),
});

// Validate environment variables
export const env = envSchema.parse(process.env);

// Ensure output directory exists
export function ensureOutputDir(output: string, subDir: string): void {
  const dir = path.join(output, subDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Write data to JSON file
export function writeJsonFile(
  output: string,
  subDir: string,
  fileName: string,
  data: unknown
): void {
  const filePath = path.join(output, subDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
  console.log(`Data written to ${filePath}`);
}

// Generic Ory API call function
export async function oryApiCall<T>(
  endpoint: string,
  pageToken?: string | null
): Promise<T> {
  const url = pageToken
    ? `${env.ORY_SDK_URL}${endpoint}?page_token=${pageToken}`
    : `${env.ORY_SDK_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${env.ORY_ACCESS_TOKEN}` },
  });

  if (!response.ok) {
    throw new Error(`Ory API call failed: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// Types
export interface RelationTuple {
  // Define the structure of a relation tuple
  // Add properties as needed
}

export interface Identity {
  id: string;
  // Add other properties as needed
}

export interface RelationTuplesResponse {
  relation_tuples: RelationTuple[];
  next_page_token: string | null;
}

export interface IdentitiesResponse extends Array<Identity> {}
