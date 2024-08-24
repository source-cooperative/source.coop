import {
  Account,
  Repository,
  Actions,
  UserSession,
  AccountFlags,
  RepositoryMode,
  AccountType,
  MembershipState,
  MembershipRole,
  RepositoryDataMode,
  APIKey,
  Membership,
} from "@/api/types";
import { isAuthorized } from "./index";

describe("Authorization Tests", () => {
  // Mock data
  const adminUser: UserSession = {
    account: {
      account_id: "admin_id",
      flags: [AccountFlags.ADMIN],
      account_type: AccountType.USER,
    },
    identity_id: "admin_identity_id",
  };

  const regularUser: UserSession = {
    account: {
      account_id: "user_id",
      flags: [],
      account_type: AccountType.USER,
    },
    identity_id: "user_identity_id",
  };

  const organizationOwner: UserSession = {
    account: {
      account_id: "owner_id",
      flags: [],
      account_type: AccountType.USER,
    },
    identity_id: "owner_identity_id",
    memberships: [
      {
        account_id: "owner_id",
        membership_account_id: "org_id",
        role: MembershipRole.Owners,
        state: MembershipState.Member,
      },
    ],
  };

  const organization: Account = {
    account_id: "org_id",
    account_type: AccountType.ORGANIZATION,
    disabled: false,
  };

  const repository: Repository = {
    repository_id: "repo_id",
    account_id: "org_id",
    disabled: false,
    mode: RepositoryMode.Listed,
    data_mode: RepositoryDataMode.Open,
  };

  const apiKey: APIKey = {
    account_id: "org_id",
  };

  const membership: Membership = {
    account_id: "user_id",
    membership_account_id: "org_id",
    repository_id: "repo_id",
    role: MembershipRole.WriteData,
    state: MembershipState.Invited,
  };

  test("Admin can perform any action", () => {
    // Account-related actions
    expect(isAuthorized(adminUser, organization, Actions.DisableAccount)).toBe(
      true
    );
    expect(isAuthorized(adminUser, organization, Actions.PutAccountFlags)).toBe(
      true
    );
    expect(
      isAuthorized(adminUser, organization, Actions.GetAccountProfile)
    ).toBe(true);

    // Repository-related actions
    expect(isAuthorized(adminUser, repository, Actions.DisableRepository)).toBe(
      true
    );
    expect(isAuthorized(adminUser, repository, Actions.PutRepository)).toBe(
      true
    );
    expect(
      isAuthorized(adminUser, repository, Actions.ReadRepositoryData)
    ).toBe(true);

    // Admins can not write data to every repository
    expect(
      isAuthorized(adminUser, repository, Actions.WriteRepositoryData)
    ).toBe(false);

    // API key-related actions
    expect(isAuthorized(adminUser, apiKey, Actions.CreateAPIKey)).toBe(true);

    // Membership-related actions
    expect(isAuthorized(adminUser, membership, Actions.InviteMembership)).toBe(
      true
    );
    // Admins can not accept membership invitations
    expect(isAuthorized(adminUser, membership, Actions.AcceptMembership)).toBe(
      false
    );
    expect(isAuthorized(adminUser, membership, Actions.RevokeMembership)).toBe(
      true
    );
  });

  test("Regular user cannot disable accounts or repositories", () => {
    expect(
      isAuthorized(regularUser, organization, Actions.DisableAccount)
    ).toBe(false);
    expect(
      isAuthorized(regularUser, repository, Actions.DisableRepository)
    ).toBe(false);
  });

  test("Organization owner can manage organization", () => {
    expect(
      isAuthorized(organizationOwner, organization, Actions.PutAccountProfile)
    ).toBe(true);
    expect(
      isAuthorized(organizationOwner, repository, Actions.PutRepository)
    ).toBe(true);
  });

  test("Any user can read open repository data", () => {
    expect(
      isAuthorized(regularUser, repository, Actions.ReadRepositoryData)
    ).toBe(true);
  });

  test("Regular user cannot write to repository", () => {
    expect(
      isAuthorized(regularUser, repository, Actions.WriteRepositoryData)
    ).toBe(false);
  });

  test("Organization owner can create API key", () => {
    expect(isAuthorized(organizationOwner, apiKey, Actions.CreateAPIKey)).toBe(
      true
    );
  });

  test("Regular user cannot create API key for organization", () => {
    expect(isAuthorized(regularUser, apiKey, Actions.CreateAPIKey)).toBe(false);
  });

  test("User can accept membership invitation", () => {
    expect(
      isAuthorized(regularUser, membership, Actions.AcceptMembership)
    ).toBe(true);
  });

  test("Organization owner can invite new member", () => {
    expect(
      isAuthorized(organizationOwner, membership, Actions.InviteMembership)
    ).toBe(true);
  });

  test("Regular user cannot invite new member", () => {
    expect(
      isAuthorized(regularUser, membership, Actions.InviteMembership)
    ).toBe(false);
  });
});
