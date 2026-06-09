import {
  isEmailVerifiedInDb,
  isEmailVerifiedInOry,
  oryAddressesToAccountEmails,
} from "./email-verification";
import { AccountType, type Account } from "@/types";
import type { Session } from "@ory/client-fetch";

function makeAccount(emails?: Account["emails"]): Account {
  return {
    account_id: "test-user",
    type: AccountType.INDIVIDUAL,
    identity_id: "identity-123",
    name: "Test User",
    emails,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    disabled: false,
    flags: [],
    metadata_public: {},
  } as Account;
}

function makeOrySession(
  verifiableAddresses?: Array<{
    value: string;
    verified: boolean;
    verified_at?: Date;
    created_at?: Date;
  }>
): Session {
  return {
    identity: {
      verifiable_addresses: verifiableAddresses,
    },
  } as unknown as Session;
}

describe("isEmailVerifiedInDb", () => {
  it("returns false when the account has no emails", () => {
    expect(isEmailVerifiedInDb(makeAccount(undefined))).toBe(false);
  });

  it("returns false when no email is verified", () => {
    expect(
      isEmailVerifiedInDb(
        makeAccount([
          {
            address: "a@example.com",
            verified: false,
            is_primary: true,
            added_at: "2024-01-01T00:00:00.000Z",
          },
        ])
      )
    ).toBe(false);
  });

  it("returns true when at least one email is verified", () => {
    expect(
      isEmailVerifiedInDb(
        makeAccount([
          {
            address: "a@example.com",
            verified: false,
            is_primary: false,
            added_at: "2024-01-01T00:00:00.000Z",
          },
          {
            address: "b@example.com",
            verified: true,
            is_primary: true,
            added_at: "2024-01-01T00:00:00.000Z",
          },
        ])
      )
    ).toBe(true);
  });
});

describe("isEmailVerifiedInOry", () => {
  it("returns false for an undefined session", () => {
    expect(isEmailVerifiedInOry(undefined)).toBe(false);
  });

  it("returns false when no address is verified", () => {
    expect(
      isEmailVerifiedInOry(
        makeOrySession([{ value: "a@example.com", verified: false }])
      )
    ).toBe(false);
  });

  it("returns true when an address is verified", () => {
    expect(
      isEmailVerifiedInOry(
        makeOrySession([{ value: "a@example.com", verified: true }])
      )
    ).toBe(true);
  });
});

describe("oryAddressesToAccountEmails", () => {
  it("returns an empty array when there are no addresses", () => {
    expect(oryAddressesToAccountEmails(makeOrySession(undefined))).toEqual([]);
  });

  it("marks the first address as primary and preserves timestamps", () => {
    const emails = oryAddressesToAccountEmails(
      makeOrySession([
        {
          value: "primary@example.com",
          verified: true,
          verified_at: new Date("2024-02-02T00:00:00.000Z"),
          created_at: new Date("2024-01-01T00:00:00.000Z"),
        },
        {
          value: "secondary@example.com",
          verified: false,
          created_at: new Date("2024-01-03T00:00:00.000Z"),
        },
      ])
    );

    expect(emails).toEqual([
      {
        address: "primary@example.com",
        verified: true,
        is_primary: true,
        added_at: "2024-01-01T00:00:00.000Z",
        verified_at: "2024-02-02T00:00:00.000Z",
      },
      {
        address: "secondary@example.com",
        verified: false,
        is_primary: false,
        added_at: "2024-01-03T00:00:00.000Z",
        verified_at: undefined,
      },
    ]);
  });
});
