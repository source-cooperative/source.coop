/** @jest-environment node */
import { NextRequest } from "next/server";
import { apiKeysTable } from "@/lib/clients/database";
import { getApiSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { LEGACY_API_KEY_DEPRECATION } from "@/lib/api/legacy-api-keys";
import { RedactedAPIKeySchema } from "@/types/api-key";
import { GET, POST } from "./route";

jest.mock("@/lib/clients/database", () => ({
  apiKeysTable: {
    listByAccount: jest.fn(),
  },
}));
jest.mock("@/lib/api/utils", () => ({
  getApiSession: jest.fn(),
}));
jest.mock("@/lib/api/authz", () => ({ isAuthorized: jest.fn() }));

describe("POST /api/v1/accounts/[account_id]/api-keys", () => {
  test("answers 410, whoever asks, and points to service account keys", async () => {
    const res = POST();
    expect(res.status).toBe(410);
    await expect(res.json()).resolves.toEqual({
      error: expect.stringContaining("service account"),
    });
    expect(getApiSession).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/accounts/[account_id]/api-keys", () => {
  afterEach(() => jest.resetAllMocks());

  test("returns 404 if account not found", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({});
    const req = {} as unknown as NextRequest;
    const res = await GET(req, { params: { account_id: "foo" } });
    expect(res.status).toBe(404);
  });

  test("returns 401 if not authorized to list", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({
      account: { account_id: "foo" },
    });
    (isAuthorized as jest.Mock).mockReturnValueOnce(false);
    const req = {} as unknown as NextRequest;
    const res = await GET(req, { params: { account_id: "foo" } });
    expect(res.status).toBe(401);
  });

  test("returns redacted keys, marked deprecated", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({
      account: { account_id: "foo" },
    });
    (isAuthorized as jest.Mock).mockImplementation(
      (session, obj, action) =>
        action === "account:listAPIKeys" || action === "api_key:get"
    );
    const apiKeys = [
      {
        access_key_id: "SCFAKEID",
        account_id: "foo",
        name: "Test",
        expires: new Date(Date.now() + 100000).toISOString(),
        disabled: false,
        secret_access_key: "x".repeat(64),
      },
    ];
    (apiKeysTable.listByAccount as jest.Mock).mockResolvedValue(apiKeys);
    const req = {} as unknown as NextRequest;
    const res = await GET(req, { params: { account_id: "foo" } });
    expect(res.status).toBe(200);
    const expected = apiKeys.map((k) => RedactedAPIKeySchema.parse(k));
    await expect(res.json()).resolves.toEqual(expected);
    expect(res.headers.get("Deprecation")).toBe(
      LEGACY_API_KEY_DEPRECATION.Deprecation
    );
    expect(res.headers.get("Sunset")).toBe(LEGACY_API_KEY_DEPRECATION.Sunset);
  });
});
