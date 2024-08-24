import { isAdmin } from "@/api/utils";
import { UserSession, AccountFlags } from "@/api/types";

describe("Authorization Tests", () => {
  test("Admin user is identified correctly", () => {
    const adminSession: UserSession = {
      account: {
        account_id: "123",
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
        disabled: false,
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
import { getProfileImage } from "./index"; // Adjust the import path as needed

describe("getProfileImage", () => {
  it("should return a valid Gravatar URL for a given email", () => {
    const email = "test@example.com";
    const result = getProfileImage(email);
    expect(result).toBe(
      "https://www.gravatar.com/avatar/55502f40dc8b7c769880b10874abc9d0"
    );
  });

  it("should trim and lowercase the email before hashing", () => {
    const email = "  TEST@EXAMPLE.COM  ";
    const result = getProfileImage(email);
    expect(result).toBe(
      "https://www.gravatar.com/avatar/55502f40dc8b7c769880b10874abc9d0"
    );
  });

  it("should use a default email if no email is provided", () => {
    const result = getProfileImage("");
    expect(result).toBe(
      "https://www.gravatar.com/avatar/7daf6c79d4802916d83f6266e24850af"
    );
  });

  it("should handle undefined email input", () => {
    const result = getProfileImage(undefined as unknown as string);
    expect(result).toBe(
      "https://www.gravatar.com/avatar/7daf6c79d4802916d83f6266e24850af"
    );
  });

  it("should return the same URL for the same email", () => {
    const email = "same@example.com";
    const result1 = getProfileImage(email);
    const result2 = getProfileImage(email);
    expect(result1).toBe(result2);
    expect(result1).toBe(
      "https://www.gravatar.com/avatar/43b05f394d5611c54a1a9e8e20baee21"
    );
  });

  it("should handle emails with different cases", () => {
    const lowerEmail = "mixed@example.com";
    const upperEmail = "MIXED@EXAMPLE.COM";
    expect(getProfileImage(lowerEmail)).toBe(getProfileImage(upperEmail));
  });

  it("should handle emails with surrounding whitespace", () => {
    const email = "whitespace@example.com";
    const spacedEmail = "  whitespace@example.com  ";
    expect(getProfileImage(email)).toBe(getProfileImage(spacedEmail));
  });
});
