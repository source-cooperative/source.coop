/**
 * @jest-environment node
 */

const mockGet = jest.fn();
jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({
    get: (...args: unknown[]) => mockGet(...args),
    set: jest.fn(),
    delete: jest.fn(),
  }),
}));

const mockFetchById = jest.fn();
const mockListByUser = jest.fn();
jest.mock("@/lib/clients/database", () => ({
  accountsTable: { fetchById: (...a: unknown[]) => mockFetchById(...a) },
  membershipsTable: { listByUser: (...a: unknown[]) => mockListByUser(...a) },
  isIndividualAccount: (acc: { type?: string }) => acc?.type === "individual",
}));

const mockIsAdmin = jest.fn();
jest.mock("@/lib/api/authz", () => ({
  isAdmin: (...a: unknown[]) => mockIsAdmin(...a),
  isAuthorized: () => true,
}));

import { applyImpersonation, IMPERSONATION_COOKIE_NAME } from "./impersonation";
import { encryptJson } from "./encrypted-cookie";
import type { UserSession } from "@/types";

const adminSession = (): UserSession => ({
  identity_id: "admin-ory-id",
  orySession: { id: "sess" } as never,
  account: { account_id: "admin", name: "Admin", type: "individual" } as never,
  memberships: [],
});

const target = {
  account_id: "alice",
  name: "Alice",
  type: "individual",
  identity_id: "alice-ory-id",
  disabled: false,
};

async function cookieFor(account_id: string) {
  return { value: await encryptJson({ account_id }) };
}

describe("applyImpersonation", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockFetchById.mockReset();
    mockListByUser.mockReset().mockResolvedValue([]);
    mockIsAdmin.mockReset();
  });

  test("swaps identity, account, and sets impersonator when admin + valid cookie", async () => {
    mockIsAdmin.mockReturnValue(true);
    mockGet.mockReturnValue(await cookieFor("alice"));
    mockFetchById.mockResolvedValue(target);

    const result = await applyImpersonation(adminSession());

    expect(mockGet).toHaveBeenCalledWith(IMPERSONATION_COOKIE_NAME);
    expect(result?.identity_id).toBe("alice-ory-id"); // full-identity swap
    expect(result?.account?.account_id).toBe("alice");
    expect(result?.impersonator).toEqual({ account_id: "admin", name: "Admin" });
  });

  test("returns the real session unchanged for a non-admin (forged cookie is inert)", async () => {
    mockIsAdmin.mockReturnValue(false);
    mockGet.mockReturnValue(await cookieFor("alice"));

    const real = { ...adminSession(), account: undefined };
    const result = await applyImpersonation(real);

    expect(result).toBe(real);
    expect(mockGet).not.toHaveBeenCalled(); // short-circuits before reading cookie
    expect(mockFetchById).not.toHaveBeenCalled();
  });

  test("returns the real session when admin but no cookie", async () => {
    mockIsAdmin.mockReturnValue(true);
    mockGet.mockReturnValue(undefined);

    const real = adminSession();
    expect(await applyImpersonation(real)).toBe(real);
  });

  test("ignores a cookie pointing at a non-individual (organization) account", async () => {
    mockIsAdmin.mockReturnValue(true);
    mockGet.mockReturnValue(await cookieFor("acme"));
    mockFetchById.mockResolvedValue({
      account_id: "acme",
      name: "Acme",
      type: "organization",
      disabled: false,
    });

    const real = adminSession();
    expect(await applyImpersonation(real)).toBe(real);
  });
});
