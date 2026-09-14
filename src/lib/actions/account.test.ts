import { updateAccountProfile } from "./account";
import { accountsTable } from "../clients";
import { getPageSession } from "../api/utils";
import { isAuthorized } from "../api/authz";
import { Account, AccountType, UserSession } from "@/types";

jest.mock("../clients", () => ({
  accountsTable: {
    fetchById: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("../api/utils", () => ({
  getPageSession: jest.fn(),
}));

jest.mock("../api/authz", () => ({
  isAuthorized: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const mockAccountsTable = accountsTable as jest.Mocked<typeof accountsTable>;
const mockGetPageSession = getPageSession as jest.MockedFunction<
  typeof getPageSession
>;
const mockIsAuthorized = isAuthorized as jest.MockedFunction<
  typeof isAuthorized
>;

const account = (overrides: Partial<Account>): Account =>
  ({
    account_id: "an-account",
    name: "An Account",
    type: AccountType.INDIVIDUAL,
    disabled: false,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    flags: [],
    metadata_public: {},
    ...overrides,
  }) as Account;

const submit = (fields: Record<string, string>) => {
  const formData = new FormData();
  formData.set("account_id", "an-account");
  formData.set("name", "An Account");
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return updateAccountProfile(null, formData);
};

const updatedEmails = () => mockAccountsTable.update.mock.calls[0][0].emails;

describe("updateAccountProfile contact email", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPageSession.mockResolvedValue({
      identity_id: "an-identity",
    } as UserSession);
    mockIsAuthorized.mockReturnValue(true);
    mockAccountsTable.update.mockResolvedValue(undefined as never);
  });

  it("stores an organization's submitted email as its unverified primary", async () => {
    mockAccountsTable.fetchById.mockResolvedValue(
      account({ type: AccountType.ORGANIZATION, emails: [] })
    );

    const result = await submit({ email: " contact@example.test " });

    expect(result.success).toBe(true);
    expect(updatedEmails()).toEqual([
      expect.objectContaining({
        address: "contact@example.test",
        is_primary: true,
        verified: false,
      }),
    ]);
  });

  // The form seeds the field with the current address, so every save of a name
  // or bio resubmits it. Rebuilding the record then would drop verified state.
  it("leaves a verified organization email alone when it is resubmitted unchanged", async () => {
    const emails = [
      {
        address: "contact@example.test",
        is_primary: true,
        verified: true,
        added_at: "2020-05-05T00:00:00.000Z",
      },
    ];
    mockAccountsTable.fetchById.mockResolvedValue(
      account({ type: AccountType.ORGANIZATION, emails })
    );

    await submit({ email: "contact@example.test" });

    expect(updatedEmails()).toEqual(emails);
  });

  it("rejects a malformed organization email without writing", async () => {
    mockAccountsTable.fetchById.mockResolvedValue(
      account({ type: AccountType.ORGANIZATION, emails: [] })
    );

    const result = await submit({ email: "not-an-email" });

    expect(result.success).toBe(false);
    expect(result.fieldErrors).toEqual({ email: ["Invalid email address"] });
    expect(mockAccountsTable.update).not.toHaveBeenCalled();
  });

  it("clears an organization's email when the field is submitted empty", async () => {
    mockAccountsTable.fetchById.mockResolvedValue(
      account({
        type: AccountType.ORGANIZATION,
        emails: [
          { address: "old@example.test", is_primary: true, verified: true },
        ],
      })
    );

    await submit({ email: "   " });

    expect(updatedEmails()).toEqual([]);
  });

  // An individual's email lives in the identity provider, so the form field is
  // read-only and never submitted. A forged submission must not move it anyway.
  it("ignores an email submitted for an individual account", async () => {
    const emails = [
      { address: "person@example.test", is_primary: true, verified: true },
    ];
    mockAccountsTable.fetchById.mockResolvedValue(
      account({ type: AccountType.INDIVIDUAL, emails })
    );

    const result = await submit({ email: "attacker@example.test" });

    expect(result.success).toBe(true);
    expect(updatedEmails()).toEqual(emails);
  });
});
