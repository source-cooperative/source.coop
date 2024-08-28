import { isAuthorized } from "./index";

import {
  Account,
  AccountSchema,
  Repository,
  RepositorySchema,
  Actions,
  UserSession,
  UserSessionSchema,
  AccountFlags,
  RepositoryState,
  AccountType,
  Membership,
  MembershipSchema,
  MembershipState,
  MembershipRole,
  RepositoryDataMode,
  APIKey,
  APIKeySchema,
  RepositoryFeatured,
  DataProvider,
} from "@/api/types";
import * as fs from "fs";
import { z } from "zod";
import * as path from "path";

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

const accounts: Account[] = loadAndValidateJson(
  path.join("src", "mock", "accounts.json"),
  z.array(AccountSchema)
);

const repositories: Repository[] = loadAndValidateJson(
  path.join("src", "mock", "repositories.json"),
  z.array(RepositorySchema)
);

const memberships: Membership[] = loadAndValidateJson(
  path.join("src", "mock", "memberships.json"),
  z.array(MembershipSchema)
);

const apiKeys: APIKey[] = loadAndValidateJson(
  path.join("src", "mock", "api-keys.json"),
  z.array(APIKeySchema)
);

const sessions: Record<string, UserSession> = {
  anonymous: null,
  "no-account": {
    identity_id: "foobar",
    account: null,
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

const mappedRepositories: Record<string, Record<string, Repository>> = {};
for (const repository of repositories) {
  if (!mappedRepositories[repository.account_id]) {
    mappedRepositories[repository.account_id] = {};
  }
  mappedRepositories[repository.account_id][repository.repository_id] =
    repository;
}

const mappedAPIKeys: Record<string, APIKey> = {};
for (const apiKey of apiKeys) {
  mappedAPIKeys[apiKey.access_key_id] = apiKey;
}

describe("Authorization Tests", () => {
  test("Action: repository:create", () => {
    const action = Actions.CreateRepository;

    // Organization Repository
    var repo = mappedRepositories["organization"]["org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);

    // Regular User Repository
    repo = mappedRepositories["create-repositories-user"]["regular-user-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);
  });

  test("Action: repository:get", () => {
    const action = Actions.GetRepository;

    // Organization Repository
    var repo = mappedRepositories["organization"]["org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(true);

    // Regular User Repository
    repo = mappedRepositories["create-repositories-user"]["regular-user-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(true);

    // Unlisted Repository
    repo = mappedRepositories["organization"]["unlisted-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(true);

    // Private Repository
    repo = mappedRepositories["organization"]["private-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);

    // Disabled Repository
    repo = mappedRepositories["organization"]["disabled-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);
  });

  test("Action: repository:list", () => {
    const action = Actions.ListRepository;

    // Organization Repository
    var repo = mappedRepositories["organization"]["org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(true);

    // Regular User Repository
    repo = mappedRepositories["create-repositories-user"]["regular-user-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(true);

    // Unlisted Repository
    repo = mappedRepositories["organization"]["unlisted-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);

    // Private Repository
    repo = mappedRepositories["organization"]["private-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);

    // Disabled Repository
    repo = mappedRepositories["organization"]["disabled-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);
  });

  test("Action: repository:disable", () => {
    const action = Actions.DisableRepository;

    // Organization Repository
    var repo = mappedRepositories["organization"]["org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);

    // Regular User Repository
    repo = mappedRepositories["create-repositories-user"]["regular-user-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);


    // Disabled Repository
    repo = mappedRepositories["organization"]["disabled-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);
  });

  test("Action: repository:put", () => {
    const action = Actions.PutRepository;

    // Organization Repository
    var repo = mappedRepositories["organization"]["org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);

    // Regular User Repository
    repo = mappedRepositories["create-repositories-user"]["regular-user-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);


    // Disabled Repository
    repo = mappedRepositories["organization"]["disabled-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);
  });

  test("Action: repository:data:read", () => {
    const action = Actions.ReadRepositoryData;

    // Organization Repository
    var repo = mappedRepositories["organization"]["org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(true);

    // Regular User Repository
    repo = mappedRepositories["create-repositories-user"]["regular-user-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(true);


    // Disabled Repository
    repo = mappedRepositories["organization"]["disabled-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);

    // Private Repository
    repo = mappedRepositories["organization"]["private-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);

    // Unlisted Repository
    repo = mappedRepositories["organization"]["unlisted-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(true);
  });

  test("Action: repository:data:write", () => {
    const action = Actions.WriteRepositoryData;

    // Organization Repository
    var repo = mappedRepositories["organization"]["org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);

    // Regular User Repository
    repo = mappedRepositories["create-repositories-user"]["regular-user-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);


    // Disabled Repository
    repo = mappedRepositories["organization"]["disabled-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);

    // Private Repository
    repo = mappedRepositories["organization"]["private-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);

    // Unlisted Repository
    repo = mappedRepositories["organization"]["unlisted-org-repo-id"];
    expect(isAuthorized(sessions["admin"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-owner-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], repo, action))
      .toBe(true);
    expect(isAuthorized(sessions["disabled"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], repo, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], repo, action))
      .toBe(false);
  });

  test("Action: account:create", () => {
    const action = Actions.CreateAccount;

    // User Account
    var account = sessions["regular-user"].account;
    expect(isAuthorized(sessions["admin"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-owner-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action))
      .toBe(true);

    // Organization Account
    var account: Account = {
      account_id: "organization",
      account_type: AccountType.ORGANIZATION,
      disabled: false,
      profile: {
        name: "Organization",
        bio: "This is an organization",
        location: "United States"
      },
      flags: [],
      email: "organization@source.coop"
    };
    expect(isAuthorized(sessions["admin"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action))
      .toBe(false);
  });

  test("Action: account:disable", () => {
    const action = Actions.DisableAccount;

    // User Account
    var account = sessions["regular-user"].account;
    expect(isAuthorized(sessions["admin"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action))
      .toBe(false);

    // Organization Account
    var account: Account = {
      account_id: "organization",
      account_type: AccountType.ORGANIZATION,
      disabled: false,
      profile: {
        name: "Organization",
        bio: "This is an organization",
        location: "United States"
      },
      flags: [],
      email: "organization@source.coop"
    };
    expect(isAuthorized(sessions["admin"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action))
      .toBe(false);
  });

  test("Action: account:get", () => {
    const action = Actions.GetAccount;

    // User Account
    var account = sessions["regular-user"].account;
    expect(isAuthorized(sessions["admin"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action))
      .toBe(false);

    // Organization Account
    var account: Account = {
      account_id: "organization",
      account_type: AccountType.ORGANIZATION,
      disabled: false,
      profile: {
        name: "Organization",
        bio: "This is an organization",
        location: "United States"
      },
      flags: [],
      email: "organization@source.coop"
    };
    expect(isAuthorized(sessions["admin"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action))
      .toBe(false);
  });

  test("Action: account:list", () => {
    const action = Actions.ListAccount;

    // User Account
    var account = sessions["regular-user"].account;
    expect(isAuthorized(sessions["admin"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action))
      .toBe(false);

    // Organization Account
    var account: Account = {
      account_id: "organization",
      account_type: AccountType.ORGANIZATION,
      disabled: false,
      profile: {
        name: "Organization",
        bio: "This is an organization",
        location: "United States"
      },
      flags: [],
      email: "organization@source.coop"
    };
    expect(isAuthorized(sessions["admin"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action))
      .toBe(false);
  });

  test("Action: account:listAPIKeys", () => {
    const action = Actions.ListAccountAPIKeys;

    // User Account
    var account = sessions["regular-user"].account;
    expect(isAuthorized(sessions["admin"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action))
      .toBe(false);

    // Organization Account
    var account: Account = {
      account_id: "organization",
      account_type: AccountType.ORGANIZATION,
      disabled: false,
      profile: {
        name: "Organization",
        bio: "This is an organization",
        location: "United States"
      },
      flags: [],
      email: "organization@source.coop"
    };
    expect(isAuthorized(sessions["admin"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action))
      .toBe(false);
  });

  test("Action: account:flags:get", () => {
    const action = Actions.GetAccountFlags;

    // User Account
    var account = sessions["regular-user"].account;
    expect(isAuthorized(sessions["admin"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action))
      .toBe(false);

    // Organization Account
    var account: Account = {
      account_id: "organization",
      account_type: AccountType.ORGANIZATION,
      disabled: false,
      profile: {
        name: "Organization",
        bio: "This is an organization",
        location: "United States"
      },
      flags: [],
      email: "organization@source.coop"
    };
    expect(isAuthorized(sessions["admin"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action))
      .toBe(false);
  });

  test("Action: account:flags:put", () => {
    const action = Actions.PutAccountFlags;

    // User Account
    var account = sessions["regular-user"].account;
    expect(isAuthorized(sessions["admin"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action))
      .toBe(false);

    // Organization Account
    var account: Account = {
      account_id: "organization",
      account_type: AccountType.ORGANIZATION,
      disabled: false,
      profile: {
        name: "Organization",
        bio: "This is an organization",
        location: "United States"
      },
      flags: [],
      email: "organization@source.coop"
    };
    expect(isAuthorized(sessions["admin"], account, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], account, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], account, action))
      .toBe(false);
  });

  test("Action: api_key:get", () => {
    const action = Actions.GetAPIKey;

    // Regular User API Key
    var apiKey = mappedAPIKeys["SCREGULARUSER"];
    expect(isAuthorized(sessions["admin"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action))
      .toBe(false);

    // Disabled API Key
    var apiKey = mappedAPIKeys["SCDISABLED"];
    expect(isAuthorized(sessions["admin"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action))
      .toBe(false);

    // Organization API Key
    var apiKey = mappedAPIKeys["SCORGANIZATION"];
    expect(isAuthorized(sessions["admin"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action))
      .toBe(false);

    // Repository API Key
    var apiKey = mappedAPIKeys["SCREPOSITORY"];
    expect(isAuthorized(sessions["admin"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action))
      .toBe(false);
  });

  test("Action: api_key:revoke", () => {
    const action = Actions.RevokeAPIKey;

    // Regular User API Key
    var apiKey = mappedAPIKeys["SCREGULARUSER"];
    expect(isAuthorized(sessions["admin"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action))
      .toBe(false);

    // Disabled API Key
    var apiKey = mappedAPIKeys["SCDISABLED"];
    expect(isAuthorized(sessions["admin"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action))
      .toBe(false);

    // Organization API Key
    var apiKey = mappedAPIKeys["SCORGANIZATION"];
    expect(isAuthorized(sessions["admin"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action))
      .toBe(false);

    // Repository API Key
    var apiKey = mappedAPIKeys["SCREPOSITORY"];
    expect(isAuthorized(sessions["admin"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action))
      .toBe(false);
  });

  test("Action: api_key:create", () => {
    const action = Actions.CreateAPIKey;

    // Regular User API Key
    var apiKey = mappedAPIKeys["SCREGULARUSER"];
    expect(isAuthorized(sessions["admin"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action))
      .toBe(false);

    // Organization API Key
    var apiKey = mappedAPIKeys["SCORGANIZATION"];
    expect(isAuthorized(sessions["admin"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action))
      .toBe(false);

    // Repository API Key
    var apiKey = mappedAPIKeys["SCREPOSITORY"];
    expect(isAuthorized(sessions["admin"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], apiKey, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], apiKey, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], apiKey, action))
      .toBe(false);
  });

  test("Action: membership:get", () => {
    const action = Actions.GetMembership;

    // Regular User Organization Invitation
    var membership = memberships.find((membership) => {
      return membership.account_id == "regular-user" && membership.membership_account_id == "organization"
    });
    expect(isAuthorized(sessions["admin"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action))
      .toBe(false);

    // Organization Owner Member
    var membership = memberships.find((membership) => {
      return membership.account_id == "organization-owner-user" && membership.membership_account_id == "organization"
    });
    expect(isAuthorized(sessions["admin"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-write-data-user"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["disabled"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["anonymous"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["no-account"], membership, action))
      .toBe(true);

    // Revoked Membership
    var membership = memberships.find((membership) => {
      return membership.account_id == "create-repositories-user" && membership.membership_account_id == "organization"
    });
    expect(isAuthorized(sessions["admin"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action))
      .toBe(false);
  });

  test("Action: membership:accept", () => {
    const action = Actions.AcceptMembership;

    // Regular User Organization Invitation
    var membership = memberships.find((membership) => {
      return membership.account_id == "regular-user" && membership.membership_account_id == "organization"
    });
    expect(isAuthorized(sessions["admin"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action))
      .toBe(false);
  });

  test("Action: membership:reject", () => {
    const action = Actions.RejectMembership;

    // Regular User Organization Invitation
    var membership = memberships.find((membership) => {
      return membership.account_id == "regular-user" && membership.membership_account_id == "organization"
    });
    expect(isAuthorized(sessions["admin"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-maintainer-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-read-data-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["create-repositories-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action))
      .toBe(false);
  });

  test("Action: membership:revoke", () => {
    const action = Actions.RevokeMembership;

    // Organization Owner Membership
    var membership = memberships.find((membership) => {
      return membership.account_id == "organization-owner-user" && membership.membership_account_id == "organization"
    });
    expect(isAuthorized(sessions["admin"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action))
      .toBe(false);

    // Organization Member Membership
    var membership = memberships.find((membership) => {
      return membership.account_id == "organization-read-data-user" && membership.membership_account_id == "organization"
    });
    expect(isAuthorized(sessions["admin"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-write-data-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action))
      .toBe(false);
  });

  test("Action: membership:invite", () => {
    const action = Actions.InviteMembership;

    // Regular User Membership Invite
    var membership = memberships.find((membership) => {
      return membership.account_id == "regular-user" && membership.membership_account_id == "organization"
    });
    expect(isAuthorized(sessions["admin"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-owner-user"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-maintainer-user"], membership, action))
      .toBe(true);
    expect(isAuthorized(sessions["organization-read-data-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["organization-write-data-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["disabled"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["regular-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["create-repositories-user"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["anonymous"], membership, action))
      .toBe(false);
    expect(isAuthorized(sessions["no-account"], membership, action))
      .toBe(false);
  });
});
