import { isAdmin, getProfileImage } from "@/api/utils";
import { UserSession, AccountFlags, AccountType } from "@/api/types";

describe("Authorization Tests", () => {
  test("Admin user is identified correctly", () => {
    const adminSession: UserSession = {
      account: {
        account_id: "123",
        account_type: AccountType.USER,
        profile: {
          name: "Admin User",
        },
        flags: [AccountFlags.ADMIN],
        disabled: false,
      },
    };
    expect(isAdmin(adminSession)).toBe(true);
  });

  test("Non-admin user is identified correctly", () => {
    const nonAdminSession: UserSession = {
      account: {
        account_id: "456",
        account_type: AccountType.USER,
        profile: {
          name: "Regular User",
        },
        flags: [],
        disabled: false,
      },
    };
    expect(isAdmin(nonAdminSession)).toBe(false);
  });

  test("User without flags is not considered admin", () => {
    const noFlagsSession: UserSession = {
      account: {
        account_id: "789",
        account_type: AccountType.USER,
        disabled: false,
        profile: {
          name: "No Flags User",
        },
        flags: [],
      },
    };
    expect(isAdmin(noFlagsSession)).toBe(false);
  });

  test("Undefined session is not considered admin", () => {
    expect(isAdmin(undefined)).toBe(false);
  });

  test("Session without account is not considered admin", () => {
    const noAccountSession: UserSession = {};
    expect(isAdmin(noAccountSession)).toBe(false);
  });
});
