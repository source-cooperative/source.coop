import { isAuthorized, isAdmin } from "@/lib/api/authz";
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

describe("Authorization: Edge Cases and Error Handling", () => {
  const adminSession = createUserSession("admin");
  const regularSession = createUserSession("regular-user");
  const _orgOwnerSession = createUserSession(
    "organization-owner-user",
    memberships
  );

  const regularAccount = accounts.find(
    (a: Account) => a.account_id === "regular-user"
  )!;
  const orgAccount = accounts.find(
    (a: Account) => a.account_id === "organization"
  )!;
  const openRepo = mockRepositories.find(
    (r: Repository) => r.repository_id === "org-repo-id"
  )!;

  describe("Account Flag Checks", () => {
    test("admin flag grants admin privileges", () => {
      expect(isAdmin(adminSession)).toBe(true);
    });

    test("non-admin users are not admins", () => {
      expect(isAdmin(regularSession)).toBe(false);
    });

    test("null session is not admin", () => {
      expect(isAdmin(null)).toBe(false);
    });

    test("session without flags is not admin", () => {
      const sessionWithoutFlags: UserSession = {
        ...regularSession,
        account: {
          ...regularSession.account!,
          flags: [],
        },
      };
      expect(isAdmin(sessionWithoutFlags)).toBe(false);
    });
  });

  describe("Membership Role Checks", () => {
    const orgOwnerSession = createUserSession(
      "organization-owner-user",
      memberships
    );
    const orgMaintainerSession = createUserSession(
      "organization-maintainer-user",
      memberships
    );
    const repoOwnerSession = createUserSession(
      "repo-member-owner",
      memberships
    );
    const repoMaintainerSession = createUserSession(
      "repo-member-maintainer",
      memberships
    );

    test("organization owner has owner role", () => {
      expect(
        isAuthorized(orgOwnerSession, orgAccount, Actions.GetAccount)
      ).toBe(true);
    });

    test("organization maintainer has maintainer role", () => {
      expect(
        isAuthorized(orgMaintainerSession, orgAccount, Actions.GetAccount)
      ).toBe(true);
    });

    test("repository owner has owner role", () => {
      expect(
        isAuthorized(repoOwnerSession, openRepo, Actions.PutRepository)
      ).toBe(true);
    });

    test("repository maintainer has maintainer role", () => {
      expect(
        isAuthorized(repoMaintainerSession, openRepo, Actions.PutRepository)
      ).toBe(true);
    });

    test("regular user has no special roles", () => {
      expect(isAuthorized(regularSession, orgAccount, Actions.GetAccount)).toBe(
        false
      );
    });
  });

  describe("Unknown Actions", () => {
    const testAccount = accounts.find(
      (a: Account) => a.account_id === "regular-user"
    )!;

    test("unknown action returns false", () => {
      expect(
        isAuthorized(adminSession, testAccount, "UnknownAction" as Actions)
      ).toBe(false);
    });
  });

  describe("Null Principal Handling", () => {
    const testAccount = accounts.find(
      (a: Account) => a.account_id === "regular-user"
    )!;
    const testRepo = mockRepositories[0];

    test("null principal cannot perform most actions", () => {
      expect(isAuthorized(null, testAccount, Actions.CreateAccount)).toBe(
        false
      );
      expect(isAuthorized(null, testAccount, Actions.GetAccount)).toBe(false);
      expect(isAuthorized(null, testRepo, Actions.CreateRepository)).toBe(
        false
      );
      expect(isAuthorized(null, testRepo, Actions.PutRepository)).toBe(false);
    });

    test("null principal can perform some public actions", () => {
      expect(isAuthorized(null, testAccount, Actions.GetAccountProfile)).toBe(
        true
      );
      expect(
        isAuthorized(null, testAccount, Actions.ListAccountMemberships)
      ).toBe(true);
    });

    test("null principal can access open repositories", () => {
      expect(isAuthorized(null, openRepo, Actions.GetRepository)).toBe(true);
      expect(isAuthorized(null, openRepo, Actions.ReadRepositoryData)).toBe(
        true
      );
    });
  });

  describe("Undefined Resource Handling", () => {
    test("undefined resource returns false", () => {
      expect(isAuthorized(adminSession, undefined, Actions.GetAccount)).toBe(
        false
      );
    });
  });

  describe("Disabled User Handling", () => {
    const disabledSession = createUserSession("disabled");
    const _disabledAccount = accounts.find(
      (a: Account) => a.account_id === "disabled"
    )!;

    test("disabled user cannot perform most actions", () => {
      expect(
        isAuthorized(disabledSession, regularAccount, Actions.GetAccount)
      ).toBe(false);
      expect(
        isAuthorized(disabledSession, openRepo, Actions.GetRepository)
      ).toBe(false);
    });

    test("disabled user can perform some actions", () => {
      expect(
        isAuthorized(
          disabledSession,
          regularAccount,
          Actions.ListAccountMemberships
        )
      ).toBe(true);
    });
  });

  describe("Disabled Resource Handling", () => {
    const disabledAccount = accounts.find(
      (a: Account) => a.account_id === "disabled"
    )!;
    const disabledRepo = mockRepositories.find(
      (r: Repository) => r.repository_id === "disabled-org-repo-id"
    )!;

    test("disabled account restricts most actions", () => {
      expect(
        isAuthorized(adminSession, disabledAccount, Actions.GetAccountProfile)
      ).toBe(false);
      expect(
        isAuthorized(adminSession, disabledAccount, Actions.PutAccountProfile)
      ).toBe(false);
    });

    test("disabled repository restricts most actions", () => {
      expect(
        isAuthorized(adminSession, disabledRepo, Actions.GetRepository)
      ).toBe(false);
      expect(
        isAuthorized(adminSession, disabledRepo, Actions.ReadRepositoryData)
      ).toBe(false);
      expect(
        isAuthorized(adminSession, disabledRepo, Actions.WriteRepositoryData)
      ).toBe(false);
    });

    test("admin can still disable disabled resources", () => {
      expect(
        isAuthorized(adminSession, disabledAccount, Actions.DisableAccount)
      ).toBe(false); // Already disabled
      expect(
        isAuthorized(adminSession, disabledRepo, Actions.DisableRepository)
      ).toBe(false); // Already disabled
    });
  });

  describe("Session Without Account", () => {
    const sessionWithoutAccount: UserSession = {
      account: undefined,
      memberships: [],
    };

    test("session without account cannot perform most actions", () => {
      expect(
        isAuthorized(sessionWithoutAccount, regularAccount, Actions.GetAccount)
      ).toBe(false);
      expect(
        isAuthorized(sessionWithoutAccount, openRepo, Actions.GetRepository)
      ).toBe(false);
    });

    test("session without account can perform some actions", () => {
      expect(
        isAuthorized(
          sessionWithoutAccount,
          regularAccount,
          Actions.ListAccountMemberships
        )
      ).toBe(true);
    });
  });

  describe("Session Without Memberships", () => {
    const sessionWithoutMemberships: UserSession = {
      account: regularSession.account!,
      memberships: [],
    };

    test("session without memberships has limited access", () => {
      expect(
        isAuthorized(sessionWithoutMemberships, orgAccount, Actions.GetAccount)
      ).toBe(false);
      expect(
        isAuthorized(sessionWithoutMemberships, openRepo, Actions.PutRepository)
      ).toBe(false);
    });

    test("session without memberships can access own resources", () => {
      expect(
        isAuthorized(
          sessionWithoutMemberships,
          regularAccount,
          Actions.GetAccount
        )
      ).toBe(true);
    });
  });

  describe("Empty Resource Arrays", () => {
    test("empty memberships array is handled correctly", () => {
      const sessionWithEmptyMemberships: UserSession = {
        account: regularSession.account!,
        memberships: [],
      };
      expect(
        isAuthorized(
          sessionWithEmptyMemberships,
          orgAccount,
          Actions.GetAccount
        )
      ).toBe(false);
    });

    test("empty flags array is handled correctly", () => {
      const sessionWithEmptyFlags: UserSession = {
        account: {
          ...regularSession.account!,
          flags: [],
        },
        memberships: [],
      };
      expect(isAdmin(sessionWithEmptyFlags)).toBe(false);
    });
  });

  describe("Invalid Membership States", () => {
    const revokedMembership = memberships.find(
      (m: Membership) => m.account_id === "create-repositories-user"
    )!;

    test("revoked membership restricts access", () => {
      const revokedUserSession = createUserSession(
        "create-repositories-user",
        memberships
      );
      expect(
        isAuthorized(
          revokedUserSession,
          revokedMembership,
          Actions.GetMembership
        )
      ).toBe(false);
    });
  });

  describe("Cross-Account Access", () => {
    test("user cannot access other user's individual account", () => {
      expect(isAuthorized(regularSession, orgAccount, Actions.GetAccount)).toBe(
        false
      );
    });

    test("user can access their own individual account", () => {
      expect(
        isAuthorized(regularSession, regularAccount, Actions.GetAccount)
      ).toBe(true);
    });
  });

  describe("Repository Data Mode Access", () => {
    const privateRepo = mockRepositories.find(
      (r: Repository) => r.repository_id === "private-org-repo-id"
    )!;

    test("open repository allows public access", () => {
      expect(isAuthorized(null, openRepo, Actions.GetRepository)).toBe(true);
      expect(isAuthorized(null, openRepo, Actions.ReadRepositoryData)).toBe(
        true
      );
    });

    test("private repository restricts public access", () => {
      expect(isAuthorized(null, privateRepo, Actions.GetRepository)).toBe(
        false
      );
      expect(isAuthorized(null, privateRepo, Actions.ReadRepositoryData)).toBe(
        false
      );
    });

    test("private repository allows member access", () => {
      const repoOwnerSession = createUserSession(
        "repo-member-owner",
        memberships
      );
      expect(
        isAuthorized(repoOwnerSession, privateRepo, Actions.GetRepository)
      ).toBe(true);
      expect(
        isAuthorized(repoOwnerSession, privateRepo, Actions.ReadRepositoryData)
      ).toBe(true);
    });
  });
});
