/** @jest-environment node */
import { NextRequest } from "next/server";
import { serviceAccountKeysTable } from "@/lib/clients/database";
import { getApiSession } from "@/lib/api/utils";
import { isAdmin } from "@/lib/api/authz";

jest.mock("@/lib/clients/database", () => ({
  serviceAccountKeysTable: { fetchByJti: jest.fn(), set: jest.fn() },
}));
jest.mock("@/lib/api/utils", () => ({ getApiSession: jest.fn() }));
jest.mock("@/lib/api/authz", () => ({ isAdmin: jest.fn() }));

const { POST } = require("./route");

const key = { jti: "j1", account_id: "acme--nightly-sync", label: "HPC", expires_at: null };
const params = { params: { jti: "j1" } };
const req = () => new NextRequest("http://localhost/api/v1/service-account-keys/j1/exchanges", { method: "POST" });

describe("POST /api/v1/service-account-keys/[jti]/exchanges", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (serviceAccountKeysTable.fetchByJti as jest.Mock).mockResolvedValue(key);
    (getApiSession as jest.Mock).mockResolvedValue({ account: { account_id: "acme--nightly-sync" } });
    (isAdmin as jest.Mock).mockReturnValue(false);
  });

  test("answers active for a live key, as the account it belongs to, and records the use", async () => {
    const res = await POST(req(), params);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ account_id: "acme--nightly-sync", active: true });
    expect(serviceAccountKeysTable.set).toHaveBeenCalledWith("j1", "last_used_at", expect.any(String));
  });

  test("answers inactive for a revoked or expired key, without recording a use", async () => {
    (serviceAccountKeysTable.fetchByJti as jest.Mock).mockResolvedValue({ ...key, revoked_at: "2026-01-01T00:00:00Z" });
    await expect((await POST(req(), params)).json()).resolves.toMatchObject({ active: false });
    (serviceAccountKeysTable.fetchByJti as jest.Mock).mockResolvedValue({ ...key, expires_at: "2020-01-01T00:00:00Z" });
    await expect((await POST(req(), params)).json()).resolves.toMatchObject({ active: false });
    expect(serviceAccountKeysTable.set).not.toHaveBeenCalled();
  });

  test("is 401 for any other account, 404 for an unknown jti", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({ account: { account_id: "someone-else" } });
    expect((await POST(req(), params)).status).toBe(401);
    (serviceAccountKeysTable.fetchByJti as jest.Mock).mockResolvedValue(null);
    expect((await POST(req(), params)).status).toBe(404);
  });
});
