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

describe("Authorization: Membership Actions", () => {
  const adminSession = createUserSession("admin");
  const disabledSession = createUserSession("disabled");
  const regularSession = createUserSession("regular-user");
  const orgOwnerSession = createUserSession(
    "organization-owner-user",
    memberships
  );
  const orgMaintainerSession = createUserSession(
    "organization-maintainer-user",
    memberships
  );
  const repoOwnerSession = createUserSession("repo-member-owner", memberships);
  const repoMaintainerSession = createUserSession(
    "repo-member-maintainer",
    memberships
  );
  const invitedUserSession = createUserSession(
    "repo-member-invited",
    memberships
  );

  const orgOwnerMembership = memberships.find(
    (m: Membership) =>
      m.account_id === "organization-owner-user" &&
      m.membership_account_id === "organization"
  )!;
  const orgMaintainerMembership = memberships.find(
    (m: Membership) =>
      m.account_id === "organization-maintainer-user" &&
      m.membership_account_id === "organization"
  )!;
  const repoOwnerMembership = memberships.find(
    (m: Membership) =>
      m.account_id === "repo-member-owner" && m.repository_id === "org-repo-id"
  )!;
  const repoMaintainerMembership = memberships.find(
    (m: Membership) =>
      m.account_id === "repo-member-maintainer" &&
      m.repository_id === "org-repo-id"
  )!;
  const invitedMembership = memberships.find(
    (m: Membership) =>
      m.account_id === "repo-member-invited" &&
      m.repository_id === "org-repo-id"
  )!;

  describe("GetMembership", () => {
    test("admin can get any membership", () => {
      expect(
        isAuthorized(adminSession, orgOwnerMembership, Actions.GetMembership)
      ).toBe(true);
    });

    test("active member can get their own membership", () => {
      expect(
        isAuthorized(orgOwnerSession, orgOwnerMembership, Actions.GetMembership)
      ).toBe(true);
    });

    test("organization owner can get organization memberships", () => {
      expect(
        isAuthorized(
          orgOwnerSession,
          orgMaintainerMembership,
          Actions.GetMembership
        )
      ).toBe(true);
    });

    test("organization maintainer can get organization memberships", () => {
      expect(
        isAuthorized(
          orgMaintainerSession,
          orgOwnerMembership,
          Actions.GetMembership
        )
      ).toBe(true);
    });

    test("repository owner can get repository memberships", () => {
      expect(
        isAuthorized(
          repoOwnerSession,
          repoMaintainerMembership,
          Actions.GetMembership
        )
      ).toBe(true);
    });

    test("repository maintainer can get repository memberships", () => {
      expect(
        isAuthorized(
          repoMaintainerSession,
          repoOwnerMembership,
          Actions.GetMembership
        )
      ).toBe(true);
    });

    test("invited user can get their own membership", () => {
      expect(
        isAuthorized(
          invitedUserSession,
          invitedMembership,
          Actions.GetMembership
        )
      ).toBe(true);
    });

    test("regular user cannot get other memberships", () => {
      expect(
        isAuthorized(regularSession, orgOwnerMembership, Actions.GetMembership)
      ).toBe(false);
    });

    test("disabled user cannot get membership", () => {
      expect(
        isAuthorized(disabledSession, orgOwnerMembership, Actions.GetMembership)
      ).toBe(false);
    });

    test("anonymous user cannot get membership", () => {
      expect(
        isAuthorized(null, orgOwnerMembership, Actions.GetMembership)
      ).toBe(false);
    });
  });

  describe("AcceptMembership", () => {
    test("admin can accept any membership", () => {
      expect(
        isAuthorized(adminSession, invitedMembership, Actions.AcceptMembership)
      ).toBe(true);
    });

    test("invited user can accept their own membership", () => {
      expect(
        isAuthorized(
          invitedUserSession,
          invitedMembership,
          Actions.AcceptMembership
        )
      ).toBe(true);
    });

    test("active member cannot accept membership", () => {
      expect(
        isAuthorized(
          orgOwnerSession,
          orgOwnerMembership,
          Actions.AcceptMembership
        )
      ).toBe(false);
    });

    test("regular user cannot accept other memberships", () => {
      expect(
        isAuthorized(
          regularSession,
          invitedMembership,
          Actions.AcceptMembership
        )
      ).toBe(false);
    });

    test("disabled user cannot accept membership", () => {
      expect(
        isAuthorized(
          disabledSession,
          invitedMembership,
          Actions.AcceptMembership
        )
      ).toBe(false);
    });

    test("anonymous user cannot accept membership", () => {
      expect(
        isAuthorized(null, invitedMembership, Actions.AcceptMembership)
      ).toBe(false);
    });
  });

  describe("RejectMembership", () => {
    test("admin can reject any membership", () => {
      expect(
        isAuthorized(adminSession, invitedMembership, Actions.RejectMembership)
      ).toBe(true);
    });

    test("invited user can reject their own membership", () => {
      expect(
        isAuthorized(
          invitedUserSession,
          invitedMembership,
          Actions.RejectMembership
        )
      ).toBe(true);
    });

    test("active member cannot reject membership", () => {
      expect(
        isAuthorized(
          orgOwnerSession,
          orgOwnerMembership,
          Actions.RejectMembership
        )
      ).toBe(false);
    });

    test("regular user cannot reject other memberships", () => {
      expect(
        isAuthorized(
          regularSession,
          invitedMembership,
          Actions.RejectMembership
        )
      ).toBe(false);
    });

    test("disabled user cannot reject membership", () => {
      expect(
        isAuthorized(
          disabledSession,
          invitedMembership,
          Actions.RejectMembership
        )
      ).toBe(false);
    });

    test("anonymous user cannot reject membership", () => {
      expect(
        isAuthorized(null, invitedMembership, Actions.RejectMembership)
      ).toBe(false);
    });
  });

  describe("RevokeMembership", () => {
    test("admin can revoke any membership", () => {
      expect(
        isAuthorized(adminSession, orgOwnerMembership, Actions.RevokeMembership)
      ).toBe(true);
    });

    test("organization owner can revoke organization memberships", () => {
      expect(
        isAuthorized(
          orgOwnerSession,
          orgMaintainerMembership,
          Actions.RevokeMembership
        )
      ).toBe(true);
    });

    test("organization maintainer can revoke organization memberships", () => {
      expect(
        isAuthorized(
          orgMaintainerSession,
          orgOwnerMembership,
          Actions.RevokeMembership
        )
      ).toBe(true);
    });

    test("repository owner can revoke repository memberships", () => {
      expect(
        isAuthorized(
          repoOwnerSession,
          repoMaintainerMembership,
          Actions.RevokeMembership
        )
      ).toBe(true);
    });

    test("repository maintainer can revoke repository memberships", () => {
      expect(
        isAuthorized(
          repoMaintainerSession,
          repoOwnerMembership,
          Actions.RevokeMembership
        )
      ).toBe(true);
    });

    test("member cannot revoke their own membership", () => {
      expect(
        isAuthorized(
          orgOwnerSession,
          orgOwnerMembership,
          Actions.RevokeMembership
        )
      ).toBe(false);
    });

    test("regular user cannot revoke memberships", () => {
      expect(
        isAuthorized(
          regularSession,
          orgOwnerMembership,
          Actions.RevokeMembership
        )
      ).toBe(false);
    });

    test("disabled user cannot revoke membership", () => {
      expect(
        isAuthorized(
          disabledSession,
          orgOwnerMembership,
          Actions.RevokeMembership
        )
      ).toBe(false);
    });

    test("anonymous user cannot revoke membership", () => {
      expect(
        isAuthorized(null, orgOwnerMembership, Actions.RevokeMembership)
      ).toBe(false);
    });
  });

  describe("InviteMembership", () => {
    test("admin can invite to any organization/repository", () => {
      expect(
        isAuthorized(adminSession, orgOwnerMembership, Actions.InviteMembership)
      ).toBe(true);
    });

    test("organization owner can invite to organization", () => {
      expect(
        isAuthorized(
          orgOwnerSession,
          orgMaintainerMembership,
          Actions.InviteMembership
        )
      ).toBe(true);
    });

    test("organization maintainer can invite to organization", () => {
      expect(
        isAuthorized(
          orgMaintainerSession,
          orgOwnerMembership,
          Actions.InviteMembership
        )
      ).toBe(true);
    });

    test("repository owner can invite to repository", () => {
      expect(
        isAuthorized(
          repoOwnerSession,
          repoMaintainerMembership,
          Actions.InviteMembership
        )
      ).toBe(true);
    });

    test("repository maintainer can invite to repository", () => {
      expect(
        isAuthorized(
          repoMaintainerSession,
          repoOwnerMembership,
          Actions.InviteMembership
        )
      ).toBe(true);
    });

    test("regular user cannot invite to organization", () => {
      expect(
        isAuthorized(
          regularSession,
          orgOwnerMembership,
          Actions.InviteMembership
        )
      ).toBe(false);
    });

    test("disabled user cannot invite membership", () => {
      expect(
        isAuthorized(
          disabledSession,
          orgOwnerMembership,
          Actions.InviteMembership
        )
      ).toBe(false);
    });

    test("anonymous user cannot invite membership", () => {
      expect(
        isAuthorized(null, orgOwnerMembership, Actions.InviteMembership)
      ).toBe(false);
    });
  });

  describe("ListAccountMemberships", () => {
    const regularAccount = accounts.find(
      (a: Account) => a.account_id === "regular-user"
    )!;
    const _orgAccount = accounts.find(
      (a: Account) => a.account_id === "organization"
    )!;

    test("anyone can list account memberships", () => {
      expect(
        isAuthorized(
          adminSession,
          regularAccount,
          Actions.ListAccountMemberships
        )
      ).toBe(true);
      expect(
        isAuthorized(
          regularSession,
          regularAccount,
          Actions.ListAccountMemberships
        )
      ).toBe(true);
      expect(
        isAuthorized(null, regularAccount, Actions.ListAccountMemberships)
      ).toBe(true);
    });

    test("disabled user can list account memberships", () => {
      expect(
        isAuthorized(
          disabledSession,
          regularAccount,
          Actions.ListAccountMemberships
        )
      ).toBe(true);
    });
  });
});
