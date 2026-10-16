import { searchAccounts, updateAccountProfile } from "./account";
import { accountsTable } from "../clients";
import { getPageSession } from "../api/utils";
import { isAuthorized } from "../api/authz";
import { Account, AccountType, Actions, UserSession } from "@/types";
import * as ops from "@/lib/operations/accounts";

jest.mock("../clients", () => ({
  accountsTable: {
    fetchById: jest.fn(),
    update: jest.fn(),
    searchMemberCandidates: jest.fn(),
  },
}));

jest.mock("../api/utils", () => ({
  getPageSession: jest.fn(),
}));

jest.mock("../api/authz", () => ({
  isAuthorized: jest.fn(),
}));

jest.mock("@/lib/operations/accounts", () => ({
  updateAccount: jest.fn(),
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

describe("updateAccountProfile", () => {
  it("hands the form's fields to the operation", async () => {
    mockGetPageSession.mockResolvedValue(null);
    (ops.updateAccount as jest.Mock).mockResolvedValue({ ok: true, value: {} });
    const formData = new FormData();
    for (const [key, value] of Object.entries({
      account_id: "an-account",
      name: "An Account",
      description: "A bio",
      email: "contact@example.test",
      websites_0: "example.test",
      websites_1: "",
    })) {
      formData.set(key, value);
    }

    const result = await updateAccountProfile(null, formData);

    expect(result.success).toBe(true);
    expect(ops.updateAccount).toHaveBeenCalledWith(null, "an-account", {
      name: "An Account",
      bio: "A bio",
      orcid: undefined,
      ror_id: undefined,
      email: "contact@example.test",
      websites: ["example.test", ""],
    });
  });
});

describe("searchAccounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPageSession.mockResolvedValue({ identity_id: "an-identity" } as UserSession);
    mockAccountsTable.searchMemberCandidates.mockResolvedValue([]);
  });

  it("offers an account's service accounts only to someone who may invite to it", async () => {
    mockIsAuthorized.mockReturnValue(true);
    await searchAccounts("bo", "acme");
    expect(mockAccountsTable.searchMemberCandidates).toHaveBeenLastCalledWith("bo", "acme");
    expect(mockIsAuthorized).toHaveBeenCalledWith(
      expect.anything(),
      { membership_account_id: "acme" },
      Actions.InviteMembership
    );

    // Anyone else gets an ordinary search of people, not a listing of acme's bots.
    mockIsAuthorized.mockReturnValue(false);
    await searchAccounts("bo", "acme");
    expect(mockAccountsTable.searchMemberCandidates).toHaveBeenLastCalledWith("bo", undefined);
  });

  it("never consults authorization for a plain search", async () => {
    await searchAccounts("bo");
    expect(mockIsAuthorized).not.toHaveBeenCalled();
    expect(mockAccountsTable.searchMemberCandidates).toHaveBeenLastCalledWith("bo", undefined);
  });
});
