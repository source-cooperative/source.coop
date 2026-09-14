import { lookupUser } from "./admin";
import { accountsTable } from "../clients";
import { getPageSession, getOryIdentityIdByEmail } from "../api/utils";
import { isAdmin } from "../api/authz";

jest.mock("../clients", () => ({
  accountsTable: {
    fetchByOryId: jest.fn(),
    fetchById: jest.fn(),
  },
}));

jest.mock("../api/utils", () => ({
  getPageSession: jest.fn(),
  getOryIdentityIdByEmail: jest.fn(),
}));

jest.mock("../api/authz", () => ({
  isAdmin: jest.fn(),
}));

const mockAccountsTable = accountsTable as jest.Mocked<typeof accountsTable>;
const mockGetPageSession = getPageSession as jest.MockedFunction<
  typeof getPageSession
>;
const mockGetOryIdentityIdByEmail =
  getOryIdentityIdByEmail as jest.MockedFunction<
    typeof getOryIdentityIdByEmail
  >;
const mockIsAdmin = isAdmin as jest.MockedFunction<typeof isAdmin>;

function formDataFor(query?: string): FormData {
  const fd = new FormData();
  if (query !== undefined) {
    fd.set("query", query);
  }
  return fd;
}

describe("lookupUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPageSession.mockResolvedValue(null);
    mockIsAdmin.mockReturnValue(true);
  });

  test("rejects non-admins", async () => {
    mockIsAdmin.mockReturnValue(false);

    const result = await lookupUser({}, formDataFor("user@example.com"));

    expect(result.success).toBe(false);
    expect(result.message).toBe("Unauthorized");
    expect(mockGetOryIdentityIdByEmail).not.toHaveBeenCalled();
  });

  test("reports a field error for an empty query", async () => {
    const result = await lookupUser({}, formDataFor("   "));

    expect(result.success).toBe(false);
    expect(result.fieldErrors.query).toBeDefined();
    expect(mockGetOryIdentityIdByEmail).not.toHaveBeenCalled();
  });

  test("reports when the email is not found in Ory", async () => {
    mockGetOryIdentityIdByEmail.mockResolvedValue(null);

    const result = await lookupUser({}, formDataFor("missing@example.com"));

    expect(result.success).toBe(false);
    expect(result.message).toContain("No user found in Ory");
    expect(mockAccountsTable.fetchByOryId).not.toHaveBeenCalled();
  });

  test("reports when the Ory identity has no source.coop profile", async () => {
    mockGetOryIdentityIdByEmail.mockResolvedValue("ory-id-1");
    mockAccountsTable.fetchByOryId.mockResolvedValue(null);

    const result = await lookupUser({}, formDataFor("user@example.com"));

    expect(result.success).toBe(false);
    expect(result.message).toContain("no source.coop profile");
  });

  test("redirects to the profile when an email matches", async () => {
    mockGetOryIdentityIdByEmail.mockResolvedValue("ory-id-1");
    mockAccountsTable.fetchByOryId.mockResolvedValue({
      account_id: "jane",
    } as Awaited<ReturnType<typeof accountsTable.fetchByOryId>>);

    const result = await lookupUser({}, formDataFor("jane@example.com"));

    expect(result.success).toBe(true);
    expect(result.redirectTo).toBe("/jane");
    expect(mockGetOryIdentityIdByEmail).toHaveBeenCalledWith("jane@example.com");
  });

  test("trims whitespace around the submitted email", async () => {
    mockGetOryIdentityIdByEmail.mockResolvedValue(null);

    await lookupUser({}, formDataFor("  spaced@example.com  "));

    expect(mockGetOryIdentityIdByEmail).toHaveBeenCalledWith(
      "spaced@example.com"
    );
  });

  test("resolves a non-email query as an account handle", async () => {
    mockAccountsTable.fetchById.mockResolvedValue({
      account_id: "jane",
    } as Awaited<ReturnType<typeof accountsTable.fetchById>>);

    const result = await lookupUser({}, formDataFor("Jane"));

    expect(result.success).toBe(true);
    expect(result.redirectTo).toBe("/jane");
    expect(mockAccountsTable.fetchById).toHaveBeenCalledWith("jane");
    expect(mockGetOryIdentityIdByEmail).not.toHaveBeenCalled();
  });

  test("reports when no account matches the handle", async () => {
    mockAccountsTable.fetchById.mockResolvedValue(null);

    const result = await lookupUser({}, formDataFor("nobody"));

    expect(result.success).toBe(false);
    expect(result.message).toContain("No account found");
  });
});
