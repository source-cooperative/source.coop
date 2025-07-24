import { NextResponse } from "next/server";
import * as path from "path";
import {
  UserSession,
  Membership,
  MembershipSchema,
  APIKey,
  APIKeySchema,
  Product,
  ProductSchema,
} from "@/types";
import { AccountType } from "@/types/account";
import { Account } from "@/types/account";
import { AccountSchema } from "@/types/account";
import * as fs from "fs";
import { z } from "zod";

function loadAndValidateJson<T extends z.ZodType>(
  path: string,
  schema: T
): z.infer<T> {
  try {
    // Read the file
    const fileContent = fs.readFileSync(path, "utf-8");

    // Parse the JSON
    const jsonData = JSON.parse(fileContent);

    // Validate against the schema
    const validatedData = schema.parse(jsonData);

    return validatedData;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // If it's a Zod validation error, throw a custom error with path and Zod error message
      throw new Error(`Validation error for file ${path}: ${error.message}`);
    } else if (error instanceof SyntaxError) {
      // If it's a JSON parsing error
      throw new Error(`Invalid JSON in file ${path}: ${error.message}`);
    } else if (error instanceof Error) {
      // For other types of errors (e.g., file not found)
      throw new Error(`Error processing file ${path}: ${error.message}`);
    } else {
      // For unknown error types
      throw new Error(
        `Unknown error occurred while processing file ${path}: ${error}`
      );
    }
  }
}

export const accounts: Account[] = loadAndValidateJson(
  path.join("src/mock", "accounts.json"),
  z.array(AccountSchema)
);

export const products: Product[] = loadAndValidateJson(
  path.join("src/mock", "products.json"),
  z.array(ProductSchema)
);

export const memberships: Membership[] = loadAndValidateJson(
  path.join("src/mock", "memberships.json"),
  z.array(MembershipSchema)
);

export const apiKeys: APIKey[] = loadAndValidateJson(
  path.join("src/mock", "api-keys.json"),
  z.array(APIKeySchema)
);

export const sessions: Record<string, UserSession | null> = {
  anonymous: null,
  "no-account": {
    identity_id: "foobar",
    memberships: [],
  },
};

for (const account of accounts) {
  if (account.type != AccountType.INDIVIDUAL) {
    continue;
  }

  const accountMemberships = [];
  for (const membership of memberships) {
    if (membership.account_id === account.account_id) {
      accountMemberships.push(membership);
    }
  }

  sessions[account.account_id] = {
    account: account,
    identity_id: account.metadata_private?.identity_id,
    memberships: accountMemberships,
  };
}

export const mappedProducts: Record<string, Record<string, Product>> = {};
for (const product of products) {
  if (!mappedProducts[product.account_id]) {
    mappedProducts[product.account_id] = {};
  }
  mappedProducts[product.account_id][product.product_id] = product;
}

export const mappedAPIKeys: Record<string, APIKey> = {};
for (const apiKey of apiKeys) {
  mappedAPIKeys[apiKey.access_key_id] = apiKey;
}

export type MockNextResponse = NextResponse & {
  _getData: () => string;
};

export function jsonBody(res: MockNextResponse) {
  return JSON.parse(res._getData());
}
