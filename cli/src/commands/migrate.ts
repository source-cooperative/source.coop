import {
  Account,
  AccountType,
  APIKey,
  Membership,
  MembershipRole,
  MembershipState,
  DataConnection,
  DataProvider,
  S3Regions,
  AzureRegions,
  AzureDataConnection,
  Repository,
  RepositoryState,
  RepositoryDataMode,
  RepositoryFeatured,
  AccountFlags,
  AccountProfile,
} from "@/api/types";
import * as fs from "fs";
import * as path from "path";
import { writeJsonFile, ensureOutputDir } from "../utils";

function getPathFromURL(url: string): string {
  try {
    const parsedURL = new URL(url);
    return parsedURL.pathname;
  } catch (error) {
    // If the URL is invalid, return an empty string or handle the error as needed
    console.error("Invalid URL:", error);
    return "";
  }
}

export async function migrate(inputDir: string, outputDir: string) {
  var str = await fs.promises.readFile(
    path.join(inputDir, "table", "source-cooperative-repositories.json")
  );
  const repositories = JSON.parse(str.toString());

  var str = await fs.promises.readFile(
    path.join(inputDir, "table", "source-cooperative-accounts.json")
  );
  const accounts = JSON.parse(str.toString());

  var str = await fs.promises.readFile(
    path.join(inputDir, "table", "source-cooperative-api-keys.json")
  );
  const apiKeys = JSON.parse(str.toString());

  var str = await fs.promises.readFile(
    path.join(inputDir, "ory", "identities.json")
  );
  const oryIdentities = JSON.parse(str.toString());

  var str = await fs.promises.readFile(
    path.join(inputDir, "ory", "relationships.json")
  );
  const oryRelationships = JSON.parse(str.toString());

  const newAccounts: Account[] = [];

  for (const account of accounts) {
    var profile: AccountProfile = {
      name: account.account_type == "organization" ? account.name : "",
    };

    if (
      account.account_type == "organization" &&
      account.description !== null
    ) {
      profile.bio = account.description;
    }

    var newAccount = {
      account_id: account.account_id,
      account_type:
        account.account_type == "user"
          ? AccountType.USER
          : AccountType.ORGANIZATION,
      disabled: account.disabled,
      profile: profile,
      identity_id: account.identity_id,
      flags: [],
    };

    newAccounts.push(newAccount);
  }

  for (const account of newAccounts) {
    if (!account.identity_id) {
      continue;
    }

    const identity = oryIdentities[account.identity_id];

    if (!identity) {
      continue;
    }

    account.profile.name =
      identity["traits"]["name"]["first_name"] +
      " " +
      identity["traits"]["name"]["last_name"];

    if (identity["traits"]["bio"] !== null) {
      account.profile.bio = identity["traits"]["bio"];
    }

    account.profile.location = identity["traits"]["country"];

    if (identity["metadata_public"]) {
      var flags = [];
      for (const flag of identity["metadata_public"]["flags"]) {
        if (flag === "create_repository") {
          flags.push(AccountFlags.CREATE_REPOSITORIES);
        } else if (flag === "admin") {
          flags.push(AccountFlags.ADMIN);
        } else if (flag === "create_organizations") {
          flags.push(AccountFlags.CREATE_ORGANIZATIONS);
        }
      }
      account.flags = flags;
    }
  }

  var filteredAccounts = [];
  for (const account of newAccounts) {
    if (account && account.profile && account.profile.name) {
      if (account?.profile?.name?.length <= 0) {
        continue;
      }
    }
    filteredAccounts.push(account);
  }

  const newMemberships: Membership[] = [];
  for (var relationship of oryRelationships) {
    if (relationship["namespace"] == "Repository") {
      continue;
    }

    if (/[A-Z]/.test(relationship["subject_id"])) {
      continue;
    }

    newMemberships.push({
      membership_id: crypto.randomUUID(),
      account_id: relationship["subject_id"],
      membership_account_id: relationship["object"],
      role:
        relationship["relation"] == "owners"
          ? MembershipRole.Owners
          : MembershipRole.Maintainers,
      state: MembershipState.Member,
      state_changed: new Date().toISOString(),
    });
  }

  const newApiKeys: APIKey[] = [];
  for (const apiKey of apiKeys) {
    newApiKeys.push({
      account_id: apiKey.account_id,
      access_key_id: apiKey.access_key_id,
      secret_access_key:
        "M1n2O3p4Q5r6S7t8U9v0W1x2Y3z4A5B6C7D8E9F0G1H2I3J4K5L6M7N8O9P00000",
      name: apiKey.name,
      disabled: apiKey.disabled,
      expires: "3000-01-01T00:00:00Z",
    });
  }

  const dataConnections: DataConnection[] = [
    {
      data_connection_id: "aws-opendata-us-west-2",
      name: "AWS Open Data (US-West-2)",
      read_only: false,
      prefix_template:
        "{{repository.repository_id}}/{{repository.account_id}}/",
      details: {
        provider: DataProvider.S3,
        bucket: "us-west-2.opendata.source.coop",
        base_prefix: "",
        region: S3Regions.US_WEST_2,
      },
    },
    {
      data_connection_id: "azure-opendata-west-europe",
      name: "Azure Open Data (West Europe)",
      prefix_template:
        "{{repository.repository_id}}/{{repository.account_id}}/",
      read_only: true,
      details: {
        provider: DataProvider.Azure,
        account_name: "radiantearth",
        container_name: "mlhub",
        base_prefix: "",
        region: AzureRegions.WEST_EUROPE,
      },
    },
  ];

  const newRepositories: Repository[] = [];
  for (const repository of repositories) {
    var prefix = "";
    const primary_mirror = repository.data.primary_mirror;
    var dataUri = repository.data.mirrors[primary_mirror].uri;
    prefix = getPathFromURL(dataUri).replace("/mlhub", "").slice(1);
    if (prefix.endsWith("/") && prefix.length > 1) {
      prefix = prefix.slice(0, -1);
    }
    prefix += "/";

    var mirrorId: string =
      repository.data.primary_mirror == "s3-us-west-2"
        ? "aws-opendata-us-west-2"
        : "azure-opendata-west-europe";

    let mirrors = {} as { [key: string]: any };
    mirrors[mirrorId] = { data_connection_id: mirrorId, prefix: prefix };

    newRepositories.push({
      repository_id: repository.repository_id,
      account_id: repository.account_id,
      state:
        repository.mode == "listed"
          ? RepositoryState.Listed
          : RepositoryState.Unlisted,
      data_mode: RepositoryDataMode.Open,
      featured:
        repository.featured == 1
          ? RepositoryFeatured.Featured
          : RepositoryFeatured.NotFeatured,
      meta: {
        description: repository.meta.description,
        title: repository.meta.title,
        tags: repository.meta.tags,
      },
      published: repository.meta.published,
      disabled: repository.disabled,
      data: {
        primary_mirror: mirrorId,
        mirrors: mirrors,
      },
    });
  }

  ensureOutputDir(outputDir, "table");

  writeJsonFile(outputDir, "table", "api-keys.json", newApiKeys);
  writeJsonFile(outputDir, "table", "memberships.json", newMemberships);
  writeJsonFile(outputDir, "table", "accounts.json", filteredAccounts);
  writeJsonFile(outputDir, "table", "repositories.json", newRepositories);
  writeJsonFile(outputDir, "table", "data-connections.json", dataConnections);
}
