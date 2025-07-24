import { isAuthorized } from "@/lib/api/authz";
import {
  Actions,
  UserSession,
  Membership,
  APIKey,
  RepositoryDataMode,
  RepositoryState,
} from "@/types";
import { Account } from "@/types/account";
import { Repository } from "@/types/product";
import { accounts, memberships, apiKeys } from "./utils.mock";

// Mock repositories for testing
const _mockRepositories: Repository[] = [
  {
    repository_id: "org-repo-id",
    account_id: "organization",
    state: RepositoryState.Listed,
    data_mode: RepositoryDataMode.Open,
    featured: 0,
    meta: {
      title: "Organization",
      description: "Organization's repository",
      tags: ["mock"],
    },
    data: {
      primary_mirror: "primary-data-connection",
      mirrors: {},
    },
    published: "2020-01-01T00:00:00Z",
    disabled: false,
  },
];

function createUserSession(
  accountId: string,
  userMemberships: Membership[] = []
): UserSession {
  const account = accounts.find((a: Account) => a.account_id === accountId);
  if (!account) throw new Error(`Account ${accountId} not found in mock data`);
  const accountMemberships = userMemberships.filter(
    (m: Membership) => m.account_id === accountId
  );
  return { account, memberships: accountMemberships };
}

// --- Begin extracted tests ---

describe("Authorization: API Key Actions", () => {
  const adminSession = createUserSession("admin");
  const disabledSession = createUserSession("disabled");
  const regularSession = createUserSession("regular-user");
  const orgOwnerSession = createUserSession(
    "organization-owner-user",
    memberships
  );
  const repoOwnerSession = createUserSession("repo-member-owner", memberships);
  const repoMaintainerSession = createUserSession(
    "repo-member-maintainer",
    memberships
  );

  const userAPIKey = apiKeys.find(
    (k: APIKey) => k.access_key_id === "SCREGULARUSER"
  )!;
  const disabledAPIKey = apiKeys.find(
    (k: APIKey) => k.access_key_id === "SCDISABLED"
  )!;
  const orgAPIKey = apiKeys.find(
    (k: APIKey) => k.access_key_id === "SCORGANIZATION"
  )!;
  const repoAPIKey = apiKeys.find(
    (k: APIKey) => k.access_key_id === "SCREPOSITORY"
  )!;

  describe("CreateAPIKey", () => {
    test("admin can create any API key", () => {
      expect(isAuthorized(adminSession, userAPIKey, Actions.CreateAPIKey)).toBe(
        true
      );
    });

    test("user can create API key for their account", () => {
      expect(
        isAuthorized(regularSession, userAPIKey, Actions.CreateAPIKey)
      ).toBe(true);
    });

    test("organization owner can create API key for organization", () => {
      expect(
        isAuthorized(orgOwnerSession, orgAPIKey, Actions.CreateAPIKey)
      ).toBe(true);
    });

    test("repository owner can create API key for repository", () => {
      expect(
        isAuthorized(repoOwnerSession, repoAPIKey, Actions.CreateAPIKey)
      ).toBe(true);
    });

    test("repository maintainer can create API key for repository", () => {
      expect(
        isAuthorized(repoMaintainerSession, repoAPIKey, Actions.CreateAPIKey)
      ).toBe(true);
    });

    test("regular user cannot create API key for other account", () => {
      expect(
        isAuthorized(regularSession, orgAPIKey, Actions.CreateAPIKey)
      ).toBe(false);
    });

    test("disabled user cannot create API key", () => {
      expect(
        isAuthorized(disabledSession, userAPIKey, Actions.CreateAPIKey)
      ).toBe(false);
    });

    test("anonymous user cannot create API key", () => {
      expect(isAuthorized(null, userAPIKey, Actions.CreateAPIKey)).toBe(false);
    });
  });

  describe("GetAPIKey", () => {
    test("admin can get any API key", () => {
      expect(isAuthorized(adminSession, userAPIKey, Actions.GetAPIKey)).toBe(
        true
      );
      expect(isAuthorized(adminSession, orgAPIKey, Actions.GetAPIKey)).toBe(
        true
      );
    });

    test("user can get their own API key", () => {
      expect(isAuthorized(regularSession, userAPIKey, Actions.GetAPIKey)).toBe(
        true
      );
    });

    test("organization owner can get organization API key", () => {
      expect(isAuthorized(orgOwnerSession, orgAPIKey, Actions.GetAPIKey)).toBe(
        true
      );
    });

    test("repository owner can get repository API key", () => {
      expect(
        isAuthorized(repoOwnerSession, repoAPIKey, Actions.GetAPIKey)
      ).toBe(true);
    });

    test("repository maintainer can get repository API key", () => {
      expect(
        isAuthorized(repoMaintainerSession, repoAPIKey, Actions.GetAPIKey)
      ).toBe(true);
    });

    test("regular user cannot get other user's API key", () => {
      expect(isAuthorized(regularSession, orgAPIKey, Actions.GetAPIKey)).toBe(
        false
      );
    });

    test("disabled user cannot get API key", () => {
      expect(isAuthorized(disabledSession, userAPIKey, Actions.GetAPIKey)).toBe(
        false
      );
    });

    test("anonymous user cannot get API key", () => {
      expect(isAuthorized(null, userAPIKey, Actions.GetAPIKey)).toBe(false);
    });

    test("cannot get disabled API key", () => {
      expect(
        isAuthorized(regularSession, disabledAPIKey, Actions.GetAPIKey)
      ).toBe(false);
    });
  });

  describe("RevokeAPIKey", () => {
    test("admin can revoke any API key", () => {
      expect(isAuthorized(adminSession, userAPIKey, Actions.RevokeAPIKey)).toBe(
        true
      );
    });

    test("user can revoke their own API key", () => {
      expect(
        isAuthorized(regularSession, userAPIKey, Actions.RevokeAPIKey)
      ).toBe(true);
    });

    test("organization owner can revoke organization API key", () => {
      expect(
        isAuthorized(orgOwnerSession, orgAPIKey, Actions.RevokeAPIKey)
      ).toBe(true);
    });

    test("repository owner can revoke repository API key", () => {
      expect(
        isAuthorized(repoOwnerSession, repoAPIKey, Actions.RevokeAPIKey)
      ).toBe(true);
    });

    test("repository maintainer can revoke repository API key", () => {
      expect(
        isAuthorized(repoMaintainerSession, repoAPIKey, Actions.RevokeAPIKey)
      ).toBe(true);
    });

    test("regular user cannot revoke other user's API key", () => {
      expect(
        isAuthorized(regularSession, orgAPIKey, Actions.RevokeAPIKey)
      ).toBe(false);
    });

    test("disabled user cannot revoke API key", () => {
      expect(
        isAuthorized(disabledSession, userAPIKey, Actions.RevokeAPIKey)
      ).toBe(false);
    });

    test("anonymous user cannot revoke API key", () => {
      expect(isAuthorized(null, userAPIKey, Actions.RevokeAPIKey)).toBe(false);
    });

    test("cannot revoke already disabled API key", () => {
      expect(
        isAuthorized(regularSession, disabledAPIKey, Actions.RevokeAPIKey)
      ).toBe(false);
    });
  });

  describe("ListAccountAPIKeys", () => {
    const regularAccount = accounts.find(
      (a: Account) => a.account_id === "regular-user"
    )!;
    const orgAccount = accounts.find(
      (a: Account) => a.account_id === "organization"
    )!;

    test("admin can list any account API keys", () => {
      expect(
        isAuthorized(adminSession, regularAccount, Actions.ListAccountAPIKeys)
      ).toBe(true);
      expect(
        isAuthorized(adminSession, orgAccount, Actions.ListAccountAPIKeys)
      ).toBe(true);
    });

    test("user can list their own account API keys", () => {
      expect(
        isAuthorized(regularSession, regularAccount, Actions.ListAccountAPIKeys)
      ).toBe(true);
    });

    test("organization owner can list organization API keys", () => {
      expect(
        isAuthorized(orgOwnerSession, orgAccount, Actions.ListAccountAPIKeys)
      ).toBe(true);
    });

    test("regular user cannot list other account API keys", () => {
      expect(
        isAuthorized(regularSession, orgAccount, Actions.ListAccountAPIKeys)
      ).toBe(false);
    });

    test("disabled user cannot list account API keys", () => {
      expect(
        isAuthorized(
          disabledSession,
          regularAccount,
          Actions.ListAccountAPIKeys
        )
      ).toBe(false);
    });

    test("anonymous user cannot list account API keys", () => {
      expect(
        isAuthorized(null, regularAccount, Actions.ListAccountAPIKeys)
      ).toBe(false);
    });
  });
});
