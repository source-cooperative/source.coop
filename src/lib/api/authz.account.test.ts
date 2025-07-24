import { isAuthorized } from "@/lib/api/authz";
import { Actions, UserSession, Membership } from "@/types";
import { Account } from "@/types/account";
import { accounts, memberships } from "./utils.mock";

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

describe("Authorization: Account Actions", () => {
  const adminSession = createUserSession("admin");
  const disabledSession = createUserSession("disabled");
  const regularSession = createUserSession("regular-user");
  const orgOwnerSession = createUserSession(
    "organization-owner-user",
    memberships
  );
  const orgAccount = accounts.find(
    (a: Account) => a.account_id === "organization"
  )!;
  const regularAccount = accounts.find(
    (a: Account) => a.account_id === "regular-user"
  )!;
  const disabledAccount = accounts.find(
    (a: Account) => a.account_id === "disabled"
  )!;

  describe("CreateAccount", () => {
    test("anonymous user cannot create individual account", () => {
      const anonymousSession: UserSession | null = null;
      expect(
        isAuthorized(anonymousSession, regularAccount, Actions.CreateAccount)
      ).toBe(false);
    });
    test("user with account cannot create another account", () => {
      expect(
        isAuthorized(regularSession, regularAccount, Actions.CreateAccount)
      ).toBe(false);
    });
    test("admin can create organization", () => {
      expect(
        isAuthorized(adminSession, orgAccount, Actions.CreateAccount)
      ).toBe(true);
    });
    test("user with create_organizations flag can create organization", () => {
      expect(
        isAuthorized(orgOwnerSession, orgAccount, Actions.CreateAccount)
      ).toBe(true);
    });
    test("regular user cannot create organization", () => {
      expect(
        isAuthorized(regularSession, orgAccount, Actions.CreateAccount)
      ).toBe(false);
    });
    test("disabled user cannot create organization", () => {
      expect(
        isAuthorized(disabledSession, orgAccount, Actions.CreateAccount)
      ).toBe(false);
    });
  });

  describe("GetAccountProfile", () => {
    test("admin can get any account profile", () => {
      expect(
        isAuthorized(adminSession, regularAccount, Actions.GetAccountProfile)
      ).toBe(true);
    });
    test("user can get their own profile", () => {
      expect(
        isAuthorized(regularSession, regularAccount, Actions.GetAccountProfile)
      ).toBe(true);
    });
    test("user can get public account profile", () => {
      expect(
        isAuthorized(regularSession, orgAccount, Actions.GetAccountProfile)
      ).toBe(true);
    });
    test("disabled user cannot get account profile", () => {
      expect(
        isAuthorized(disabledSession, regularAccount, Actions.GetAccountProfile)
      ).toBe(false);
    });
    test("cannot get profile of disabled account", () => {
      expect(
        isAuthorized(regularSession, disabledAccount, Actions.GetAccountProfile)
      ).toBe(false);
    });
  });

  describe("PutAccountProfile", () => {
    test("admin can update any account profile", () => {
      expect(
        isAuthorized(adminSession, regularAccount, Actions.PutAccountProfile)
      ).toBe(true);
    });
    test("user can update their own profile", () => {
      expect(
        isAuthorized(regularSession, regularAccount, Actions.PutAccountProfile)
      ).toBe(true);
    });
    test("organization owner can update organization profile", () => {
      expect(
        isAuthorized(orgOwnerSession, orgAccount, Actions.PutAccountProfile)
      ).toBe(true);
    });
    test("regular user cannot update other user's profile", () => {
      const otherAccount = accounts.find(
        (a: Account) => a.account_id === "create-repositories-user"
      )!;
      expect(
        isAuthorized(regularSession, otherAccount, Actions.PutAccountProfile)
      ).toBe(false);
    });
    test("cannot update profile of disabled account", () => {
      expect(
        isAuthorized(regularSession, disabledAccount, Actions.PutAccountProfile)
      ).toBe(false);
    });
  });

  describe("DisableAccount", () => {
    test("admin can disable any account", () => {
      expect(
        isAuthorized(adminSession, regularAccount, Actions.DisableAccount)
      ).toBe(true);
    });
    test("organization owner can disable organization", () => {
      expect(
        isAuthorized(orgOwnerSession, orgAccount, Actions.DisableAccount)
      ).toBe(true);
    });
    test("regular user cannot disable account", () => {
      expect(
        isAuthorized(regularSession, regularAccount, Actions.DisableAccount)
      ).toBe(false);
    });
    test("disabled user cannot disable account", () => {
      expect(
        isAuthorized(disabledSession, regularAccount, Actions.DisableAccount)
      ).toBe(false);
    });
  });
});
