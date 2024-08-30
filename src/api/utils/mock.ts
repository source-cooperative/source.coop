import { NextApiResponse } from "next";
import * as path from "path";
import {
  Account,
  AccountSchema,
  Repository,
  RepositorySchema,
  UserSession,
  AccountType,
  Membership,
  MembershipSchema,
  APIKey,
  APIKeySchema,
} from "@/api/types";
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
      throw new Error(`Unknown error occurred while processing file ${path}`);
    }
  }
}

export const accounts: Account[] = loadAndValidateJson(
  path.join("src", "mock", "accounts.json"),
  z.array(AccountSchema)
);

export const repositories: Repository[] = loadAndValidateJson(
  path.join("src", "mock", "repositories.json"),
  z.array(RepositorySchema)
);

export const memberships: Membership[] = loadAndValidateJson(
  path.join("src", "mock", "memberships.json"),
  z.array(MembershipSchema)
);

export const apiKeys: APIKey[] = loadAndValidateJson(
  path.join("src", "mock", "api-keys.json"),
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
  if (account.account_type != AccountType.USER) {
    continue;
  }

  var accountMemberships = [];
  for (const membership of memberships) {
    if (membership.account_id === account.account_id) {
      accountMemberships.push(membership);
    }
  }

  sessions[account.account_id] = {
    account: account,
    identity_id: account.identity_id,
    memberships: accountMemberships,
  };
}

export const mappedRepositories: Record<
  string,
  Record<string, Repository>
> = {};
for (const repository of repositories) {
  if (!mappedRepositories[repository.account_id]) {
    mappedRepositories[repository.account_id] = {};
  }
  mappedRepositories[repository.account_id][repository.repository_id] =
    repository;
}

export const mappedAPIKeys: Record<string, APIKey> = {};
for (const apiKey of apiKeys) {
  mappedAPIKeys[apiKey.access_key_id] = apiKey;
}

export type MockNextApiResponse = NextApiResponse & {
  _getData: () => string;
};

export function jsonBody(res: MockNextApiResponse) {
  return JSON.parse(res._getData());
}
