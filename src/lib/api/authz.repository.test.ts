import { isAuthorized } from "@/lib/api/authz";
import {
  Actions,
  UserSession,
  Membership,
  RepositoryDataMode,
  RepositoryState,
} from "@/types";
import { Account } from "@/types/account";
import { Repository } from "@/types/product";
import { accounts, memberships } from "./utils.mock";

// Mock repositories for testing
const mockRepositories: Repository[] = [
  {
    repository_id: "regular-user-repo-id",
    account_id: "create-repositories-user",
    state: RepositoryState.Listed,
    data_mode: RepositoryDataMode.Open,
    featured: 0,
    meta: {
      title: "Regular",
      description: "Regular user's repository",
      tags: ["mock"],
    },
    data: {
      primary_mirror: "primary-data-connection",
      mirrors: {},
    },
    published: "2020-01-01T00:00:00Z",
    disabled: false,
  },
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
  {
    repository_id: "disabled-org-repo-id",
    account_id: "organization",
    state: RepositoryState.Unlisted,
    data_mode: RepositoryDataMode.Private,
    featured: 0,
    meta: {
      title: "Disabled Repo",
      description: "Disabled Organization's repository",
      tags: ["mock"],
    },
    data: {
      primary_mirror: "primary-data-connection",
      mirrors: {},
    },
    published: "2020-01-01T00:00:00Z",
    disabled: true,
  },
  {
    repository_id: "private-org-repo-id",
    account_id: "organization",
    state: RepositoryState.Unlisted,
    data_mode: RepositoryDataMode.Private,
    featured: 0,
    meta: {
      title: "Private Repo",
      description: "Private Organization's repository",
      tags: ["mock", "private"],
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

describe("Authorization: Repository Actions", () => {
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
  const repoReadDataSession = createUserSession(
    "repo-member-read-data",
    memberships
  );
  const repoWriteDataSession = createUserSession(
    "repo-member-write-data",
    memberships
  );
  const createReposSession = createUserSession("create-repositories-user");

  const openRepo = mockRepositories.find(
    (r: Repository) =>
      r.repository_id === "org-repo-id" &&
      r.data_mode === RepositoryDataMode.Open &&
      !r.disabled
  )!;
  const privateRepo = mockRepositories.find(
    (r: Repository) =>
      r.repository_id === "private-org-repo-id" &&
      r.data_mode === RepositoryDataMode.Private &&
      !r.disabled
  )!;
  const disabledRepo = mockRepositories.find(
    (r: Repository) => r.repository_id === "disabled-org-repo-id" && r.disabled
  )!;
  const userRepo = mockRepositories.find(
    (r: Repository) => r.repository_id === "regular-user-repo-id"
  )!;

  describe("CreateRepository", () => {
    test("admin can create repository", () => {
      expect(
        isAuthorized(adminSession, openRepo, Actions.CreateRepository)
      ).toBe(true);
    });

    test("user with create_repositories flag can create repository under their account", () => {
      expect(
        isAuthorized(createReposSession, userRepo, Actions.CreateRepository)
      ).toBe(true);
    });

    test("organization owner can create repository under organization", () => {
      expect(
        isAuthorized(orgOwnerSession, openRepo, Actions.CreateRepository)
      ).toBe(true);
    });

    test("regular user cannot create repository", () => {
      expect(
        isAuthorized(regularSession, openRepo, Actions.CreateRepository)
      ).toBe(false);
    });

    test("disabled user cannot create repository", () => {
      expect(
        isAuthorized(disabledSession, openRepo, Actions.CreateRepository)
      ).toBe(false);
    });

    test("anonymous user cannot create repository", () => {
      expect(isAuthorized(null, openRepo, Actions.CreateRepository)).toBe(
        false
      );
    });
  });

  describe("GetRepository", () => {
    test("admin can get any repository", () => {
      expect(isAuthorized(adminSession, openRepo, Actions.GetRepository)).toBe(
        true
      );
      expect(
        isAuthorized(adminSession, privateRepo, Actions.GetRepository)
      ).toBe(true);
    });

    test("anyone can get open repository", () => {
      expect(
        isAuthorized(regularSession, openRepo, Actions.GetRepository)
      ).toBe(true);
      expect(isAuthorized(null, openRepo, Actions.GetRepository)).toBe(true);
    });

    test("account owner can get their repository", () => {
      expect(
        isAuthorized(createReposSession, userRepo, Actions.GetRepository)
      ).toBe(true);
    });

    test("organization owner can get organization repository", () => {
      expect(
        isAuthorized(orgOwnerSession, privateRepo, Actions.GetRepository)
      ).toBe(true);
    });

    test("repository owner can get repository", () => {
      expect(
        isAuthorized(repoOwnerSession, privateRepo, Actions.GetRepository)
      ).toBe(true);
    });

    test("repository maintainer can get repository", () => {
      expect(
        isAuthorized(repoMaintainerSession, privateRepo, Actions.GetRepository)
      ).toBe(true);
    });

    test("repository read data member can get repository", () => {
      expect(
        isAuthorized(repoReadDataSession, privateRepo, Actions.GetRepository)
      ).toBe(true);
    });

    test("repository write data member can get repository", () => {
      expect(
        isAuthorized(repoWriteDataSession, privateRepo, Actions.GetRepository)
      ).toBe(true);
    });

    test("regular user cannot get private repository", () => {
      expect(
        isAuthorized(regularSession, privateRepo, Actions.GetRepository)
      ).toBe(false);
    });

    test("anonymous user cannot get private repository", () => {
      expect(isAuthorized(null, privateRepo, Actions.GetRepository)).toBe(
        false
      );
    });

    test("disabled user cannot get repository", () => {
      expect(
        isAuthorized(disabledSession, openRepo, Actions.GetRepository)
      ).toBe(false);
    });

    test("cannot get disabled repository", () => {
      expect(
        isAuthorized(regularSession, disabledRepo, Actions.GetRepository)
      ).toBe(false);
    });
  });

  describe("ListRepository", () => {
    test("admin can list any repository", () => {
      expect(isAuthorized(adminSession, openRepo, Actions.ListRepository)).toBe(
        true
      );
      expect(
        isAuthorized(adminSession, privateRepo, Actions.ListRepository)
      ).toBe(true);
    });

    test("anyone can list open and listed repository", () => {
      expect(
        isAuthorized(regularSession, openRepo, Actions.ListRepository)
      ).toBe(true);
      expect(isAuthorized(null, openRepo, Actions.ListRepository)).toBe(true);
    });

    test("account owner can list their repository", () => {
      expect(
        isAuthorized(createReposSession, userRepo, Actions.ListRepository)
      ).toBe(true);
    });

    test("organization owner can list organization repository", () => {
      expect(
        isAuthorized(orgOwnerSession, privateRepo, Actions.ListRepository)
      ).toBe(true);
    });

    test("repository owner can list repository", () => {
      expect(
        isAuthorized(repoOwnerSession, privateRepo, Actions.ListRepository)
      ).toBe(true);
    });

    test("repository maintainer can list repository", () => {
      expect(
        isAuthorized(repoMaintainerSession, privateRepo, Actions.ListRepository)
      ).toBe(true);
    });

    test("repository read data member can list repository", () => {
      expect(
        isAuthorized(repoReadDataSession, privateRepo, Actions.ListRepository)
      ).toBe(true);
    });

    test("repository write data member can list repository", () => {
      expect(
        isAuthorized(repoWriteDataSession, privateRepo, Actions.ListRepository)
      ).toBe(true);
    });

    test("regular user cannot list private repository", () => {
      expect(
        isAuthorized(regularSession, privateRepo, Actions.ListRepository)
      ).toBe(false);
    });

    test("anonymous user cannot list private repository", () => {
      expect(isAuthorized(null, privateRepo, Actions.ListRepository)).toBe(
        false
      );
    });

    test("disabled user cannot list repository", () => {
      expect(
        isAuthorized(disabledSession, openRepo, Actions.ListRepository)
      ).toBe(false);
    });

    test("cannot list disabled repository", () => {
      expect(
        isAuthorized(regularSession, disabledRepo, Actions.ListRepository)
      ).toBe(false);
    });
  });

  describe("PutRepository", () => {
    test("admin can update any repository", () => {
      expect(isAuthorized(adminSession, openRepo, Actions.PutRepository)).toBe(
        true
      );
    });

    test("account owner can update their repository", () => {
      expect(
        isAuthorized(createReposSession, userRepo, Actions.PutRepository)
      ).toBe(true);
    });

    test("organization owner can update organization repository", () => {
      expect(
        isAuthorized(orgOwnerSession, openRepo, Actions.PutRepository)
      ).toBe(true);
    });

    test("repository owner can update repository", () => {
      expect(
        isAuthorized(repoOwnerSession, openRepo, Actions.PutRepository)
      ).toBe(true);
    });

    test("repository maintainer can update repository", () => {
      expect(
        isAuthorized(repoMaintainerSession, openRepo, Actions.PutRepository)
      ).toBe(true);
    });

    test("repository read data member cannot update repository", () => {
      expect(
        isAuthorized(repoReadDataSession, openRepo, Actions.PutRepository)
      ).toBe(false);
    });

    test("repository write data member cannot update repository", () => {
      expect(
        isAuthorized(repoWriteDataSession, openRepo, Actions.PutRepository)
      ).toBe(false);
    });

    test("regular user cannot update repository", () => {
      expect(
        isAuthorized(regularSession, openRepo, Actions.PutRepository)
      ).toBe(false);
    });

    test("anonymous user cannot update repository", () => {
      expect(isAuthorized(null, openRepo, Actions.PutRepository)).toBe(false);
    });

    test("disabled user cannot update repository", () => {
      expect(
        isAuthorized(disabledSession, openRepo, Actions.PutRepository)
      ).toBe(false);
    });

    test("cannot update disabled repository", () => {
      expect(
        isAuthorized(orgOwnerSession, disabledRepo, Actions.PutRepository)
      ).toBe(false);
    });
  });

  describe("DisableRepository", () => {
    test("admin can disable any repository", () => {
      expect(
        isAuthorized(adminSession, openRepo, Actions.DisableRepository)
      ).toBe(true);
    });

    test("account owner can disable their repository", () => {
      expect(
        isAuthorized(createReposSession, userRepo, Actions.DisableRepository)
      ).toBe(true);
    });

    test("organization owner can disable organization repository", () => {
      expect(
        isAuthorized(orgOwnerSession, openRepo, Actions.DisableRepository)
      ).toBe(true);
    });

    test("repository owner can disable repository", () => {
      expect(
        isAuthorized(repoOwnerSession, openRepo, Actions.DisableRepository)
      ).toBe(true);
    });

    test("repository maintainer can disable repository", () => {
      expect(
        isAuthorized(repoMaintainerSession, openRepo, Actions.DisableRepository)
      ).toBe(true);
    });

    test("repository read data member cannot disable repository", () => {
      expect(
        isAuthorized(repoReadDataSession, openRepo, Actions.DisableRepository)
      ).toBe(false);
    });

    test("repository write data member cannot disable repository", () => {
      expect(
        isAuthorized(repoWriteDataSession, openRepo, Actions.DisableRepository)
      ).toBe(false);
    });

    test("regular user cannot disable repository", () => {
      expect(
        isAuthorized(regularSession, openRepo, Actions.DisableRepository)
      ).toBe(false);
    });

    test("anonymous user cannot disable repository", () => {
      expect(isAuthorized(null, openRepo, Actions.DisableRepository)).toBe(
        false
      );
    });

    test("disabled user cannot disable repository", () => {
      expect(
        isAuthorized(disabledSession, openRepo, Actions.DisableRepository)
      ).toBe(false);
    });

    test("cannot disable already disabled repository", () => {
      expect(
        isAuthorized(orgOwnerSession, disabledRepo, Actions.DisableRepository)
      ).toBe(false);
    });
  });

  describe("ReadRepositoryData", () => {
    test("admin can read any repository data", () => {
      expect(
        isAuthorized(adminSession, openRepo, Actions.ReadRepositoryData)
      ).toBe(true);
      expect(
        isAuthorized(adminSession, privateRepo, Actions.ReadRepositoryData)
      ).toBe(true);
    });

    test("anyone can read open repository data", () => {
      expect(
        isAuthorized(regularSession, openRepo, Actions.ReadRepositoryData)
      ).toBe(true);
      expect(isAuthorized(null, openRepo, Actions.ReadRepositoryData)).toBe(
        true
      );
    });

    test("account owner can read their repository data", () => {
      expect(
        isAuthorized(createReposSession, userRepo, Actions.ReadRepositoryData)
      ).toBe(true);
    });

    test("organization owner can read organization repository data", () => {
      expect(
        isAuthorized(orgOwnerSession, privateRepo, Actions.ReadRepositoryData)
      ).toBe(true);
    });

    test("repository owner can read repository data", () => {
      expect(
        isAuthorized(repoOwnerSession, privateRepo, Actions.ReadRepositoryData)
      ).toBe(true);
    });

    test("repository maintainer can read repository data", () => {
      expect(
        isAuthorized(
          repoMaintainerSession,
          privateRepo,
          Actions.ReadRepositoryData
        )
      ).toBe(true);
    });

    test("repository read data member can read repository data", () => {
      expect(
        isAuthorized(
          repoReadDataSession,
          privateRepo,
          Actions.ReadRepositoryData
        )
      ).toBe(true);
    });

    test("repository write data member can read repository data", () => {
      expect(
        isAuthorized(
          repoWriteDataSession,
          privateRepo,
          Actions.ReadRepositoryData
        )
      ).toBe(true);
    });

    test("regular user cannot read private repository data", () => {
      expect(
        isAuthorized(regularSession, privateRepo, Actions.ReadRepositoryData)
      ).toBe(false);
    });

    test("anonymous user cannot read private repository data", () => {
      expect(isAuthorized(null, privateRepo, Actions.ReadRepositoryData)).toBe(
        false
      );
    });

    test("disabled user cannot read repository data", () => {
      expect(
        isAuthorized(disabledSession, openRepo, Actions.ReadRepositoryData)
      ).toBe(false);
    });

    test("cannot read disabled repository data", () => {
      expect(
        isAuthorized(regularSession, disabledRepo, Actions.ReadRepositoryData)
      ).toBe(false);
    });
  });

  describe("WriteRepositoryData", () => {
    test("admin can write to any repository", () => {
      expect(
        isAuthorized(adminSession, openRepo, Actions.WriteRepositoryData)
      ).toBe(true);
    });

    test("account owner can write to their repository", () => {
      expect(
        isAuthorized(createReposSession, userRepo, Actions.WriteRepositoryData)
      ).toBe(true);
    });

    test("organization owner can write to organization repository", () => {
      expect(
        isAuthorized(orgOwnerSession, openRepo, Actions.WriteRepositoryData)
      ).toBe(true);
    });

    test("repository owner can write to repository", () => {
      expect(
        isAuthorized(repoOwnerSession, openRepo, Actions.WriteRepositoryData)
      ).toBe(true);
    });

    test("repository maintainer can write to repository", () => {
      expect(
        isAuthorized(
          repoMaintainerSession,
          openRepo,
          Actions.WriteRepositoryData
        )
      ).toBe(true);
    });

    test("repository write data member can write to repository", () => {
      expect(
        isAuthorized(
          repoWriteDataSession,
          openRepo,
          Actions.WriteRepositoryData
        )
      ).toBe(true);
    });

    test("repository read data member cannot write to repository", () => {
      expect(
        isAuthorized(repoReadDataSession, openRepo, Actions.WriteRepositoryData)
      ).toBe(false);
    });

    test("regular user cannot write to repository", () => {
      expect(
        isAuthorized(regularSession, openRepo, Actions.WriteRepositoryData)
      ).toBe(false);
    });

    test("anonymous user cannot write to repository", () => {
      expect(isAuthorized(null, openRepo, Actions.WriteRepositoryData)).toBe(
        false
      );
    });

    test("disabled user cannot write to repository", () => {
      expect(
        isAuthorized(disabledSession, openRepo, Actions.WriteRepositoryData)
      ).toBe(false);
    });

    test("cannot write to disabled repository", () => {
      expect(
        isAuthorized(orgOwnerSession, disabledRepo, Actions.WriteRepositoryData)
      ).toBe(false);
    });
  });

  describe("ListRepositoryAPIKeys", () => {
    test("admin can list any repository API keys", () => {
      expect(
        isAuthorized(adminSession, openRepo, Actions.ListRepositoryAPIKeys)
      ).toBe(true);
    });

    test("account owner can list their repository API keys", () => {
      expect(
        isAuthorized(
          createReposSession,
          userRepo,
          Actions.ListRepositoryAPIKeys
        )
      ).toBe(true);
    });

    test("organization owner can list organization repository API keys", () => {
      expect(
        isAuthorized(orgOwnerSession, openRepo, Actions.ListRepositoryAPIKeys)
      ).toBe(true);
    });

    test("repository owner can list repository API keys", () => {
      expect(
        isAuthorized(repoOwnerSession, openRepo, Actions.ListRepositoryAPIKeys)
      ).toBe(true);
    });

    test("repository maintainer can list repository API keys", () => {
      expect(
        isAuthorized(
          repoMaintainerSession,
          openRepo,
          Actions.ListRepositoryAPIKeys
        )
      ).toBe(true);
    });

    test("repository read data member cannot list repository API keys", () => {
      expect(
        isAuthorized(
          repoReadDataSession,
          openRepo,
          Actions.ListRepositoryAPIKeys
        )
      ).toBe(false);
    });

    test("repository write data member cannot list repository API keys", () => {
      expect(
        isAuthorized(
          repoWriteDataSession,
          openRepo,
          Actions.ListRepositoryAPIKeys
        )
      ).toBe(false);
    });

    test("regular user cannot list repository API keys", () => {
      expect(
        isAuthorized(regularSession, openRepo, Actions.ListRepositoryAPIKeys)
      ).toBe(false);
    });

    test("anonymous user cannot list repository API keys", () => {
      expect(isAuthorized(null, openRepo, Actions.ListRepositoryAPIKeys)).toBe(
        false
      );
    });

    test("disabled user cannot list repository API keys", () => {
      expect(
        isAuthorized(disabledSession, openRepo, Actions.ListRepositoryAPIKeys)
      ).toBe(false);
    });
  });

  describe("ListRepositoryMemberships", () => {
    test("admin can list any repository memberships", () => {
      expect(
        isAuthorized(adminSession, openRepo, Actions.ListRepositoryMemberships)
      ).toBe(true);
    });

    test("account owner can list their repository memberships", () => {
      expect(
        isAuthorized(
          createReposSession,
          userRepo,
          Actions.ListRepositoryMemberships
        )
      ).toBe(true);
    });

    test("organization owner can list organization repository memberships", () => {
      expect(
        isAuthorized(
          orgOwnerSession,
          openRepo,
          Actions.ListRepositoryMemberships
        )
      ).toBe(true);
    });

    test("repository owner can list repository memberships", () => {
      expect(
        isAuthorized(
          repoOwnerSession,
          openRepo,
          Actions.ListRepositoryMemberships
        )
      ).toBe(true);
    });

    test("repository maintainer can list repository memberships", () => {
      expect(
        isAuthorized(
          repoMaintainerSession,
          openRepo,
          Actions.ListRepositoryMemberships
        )
      ).toBe(true);
    });

    test("repository read data member cannot list repository memberships", () => {
      expect(
        isAuthorized(
          repoReadDataSession,
          openRepo,
          Actions.ListRepositoryMemberships
        )
      ).toBe(false);
    });

    test("repository write data member cannot list repository memberships", () => {
      expect(
        isAuthorized(
          repoWriteDataSession,
          openRepo,
          Actions.ListRepositoryMemberships
        )
      ).toBe(false);
    });

    test("regular user cannot list repository memberships", () => {
      expect(
        isAuthorized(
          regularSession,
          openRepo,
          Actions.ListRepositoryMemberships
        )
      ).toBe(false);
    });

    test("anonymous user cannot list repository memberships", () => {
      expect(
        isAuthorized(null, openRepo, Actions.ListRepositoryMemberships)
      ).toBe(false);
    });

    test("disabled user cannot list repository memberships", () => {
      expect(
        isAuthorized(
          disabledSession,
          openRepo,
          Actions.ListRepositoryMemberships
        )
      ).toBe(false);
    });
  });
});
