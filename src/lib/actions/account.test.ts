import { createOrganization, searchAccounts, updateAccountProfile } from "./account";
import { getPageSession } from "../api/utils";
import { Account, AccountType, UserSession } from "@/types";
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
  searchAccounts: jest.fn(),
  createOrganization: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const mockGetPageSession = getPageSession as jest.MockedFunction<
  typeof getPageSession
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
  const SESSION = { identity_id: "an-identity" } as UserSession;
  beforeEach(() => mockGetPageSession.mockResolvedValue(SESSION));

  it("answers the operation's items, and nothing for a refused search", async () => {
    (ops.searchAccounts as jest.Mock).mockResolvedValue({
      ok: true,
      value: { items: [{ account_id: "bob" }], next_cursor: null },
    });
    expect(await searchAccounts("bo", "acme")).toEqual([{ account_id: "bob" }]);
    expect(ops.searchAccounts).toHaveBeenCalledWith(SESSION, { q: "bo", member_of: "acme" });

    (ops.searchAccounts as jest.Mock).mockResolvedValue({
      ok: true,
      value: { items: [{ account_id: "gone", disabled: true }], next_cursor: null },
    });
    expect(await searchAccounts("gone@example.com")).toEqual([]);

    (ops.searchAccounts as jest.Mock).mockResolvedValue({ ok: false, error: "invalid", message: "" });
    expect(await searchAccounts("b")).toEqual([]);
  });
});

describe("createOrganization", () => {
  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [k, v] of Object.entries(fields)) data.set(k, v);
    return data;
  };

  it("shows the operation's bio and websites errors on the form's own fields", async () => {
    (ops.createOrganization as jest.Mock).mockResolvedValue({
      ok: false,
      error: "invalid",
      message: "Invalid input",
      fieldErrors: { websites: ["Each website must be a URL"], bio: ["Too long"], name: ["Short"] },
    });
    const state = await createOrganization(null, form({ website: "https://", description: "x" }));
    expect(ops.createOrganization).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ bio: "x", websites: ["https://"] })
    );
    expect(state.fieldErrors).toEqual({
      website: ["Each website must be a URL"],
      description: ["Too long"],
      name: ["Short"],
    });
  });

  it("redirects to the new organization, and reports a failed write on the form", async () => {
    (ops.createOrganization as jest.Mock).mockResolvedValue({ ok: true, value: { account_id: "acme" } });
    expect(await createOrganization(null, form({}))).toMatchObject({ success: true, redirectTo: "/acme" });

    (ops.createOrganization as jest.Mock).mockRejectedValue(new Error("throttled"));
    expect(await createOrganization(null, form({}))).toMatchObject({ success: false });
  });
});
