/** @jest-environment node */
import { NextRequest } from "next/server";
import { accountsTable, serviceAccountKeysTable } from "@/lib/clients/database";
import { verifyProxyAssertion } from "@/lib/api/oidc";

jest.mock("@/lib/clients/database", () => ({
  serviceAccountKeysTable: { fetchByHash: jest.fn(), set: jest.fn() },
  accountsTable: { fetchById: jest.fn() },
}));
jest.mock("@/lib/api/oidc", () => ({
  verifyProxyAssertion: jest.fn(),
  PROXY_SELF_SUBJECT: "urn:source:data-proxy",
}));

const { POST } = require("./route");

const HASH = "a".repeat(64);
const key = { key_hash: HASH, key_id: "k1", account_id: "acme--nightly-sync", label: "HPC", expires_at: null };
const req = (body: unknown = { key_hash: HASH }) =>
  new NextRequest("http://localhost/api/v1/service-account-keys/exchanges", {
    method: "POST",
    headers: { authorization: "Bearer proxy", "x-request-id": "r1" },
    body: JSON.stringify(body),
  });

describe("POST /api/v1/service-account-keys/exchanges", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (verifyProxyAssertion as jest.Mock).mockResolvedValue({ sub: "urn:source:data-proxy" });
    (serviceAccountKeysTable.fetchByHash as jest.Mock).mockResolvedValue(key);
    (serviceAccountKeysTable.set as jest.Mock).mockResolvedValue(undefined);
    (accountsTable.fetchById as jest.Mock).mockResolvedValue({ account_id: "acme--nightly-sync", disabled: false });
  });

  test("answers active with the account for a live key, and records the use", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ account_id: "acme--nightly-sync", key_id: "k1", active: true });
    expect(serviceAccountKeysTable.fetchByHash).toHaveBeenCalledWith(HASH);
    expect(serviceAccountKeysTable.set).toHaveBeenCalledWith(HASH, "last_used_at", expect.any(String));
  });

  test("still answers active when recording the use fails", async () => {
    (serviceAccountKeysTable.set as jest.Mock).mockRejectedValue(new Error("throttled"));
    await expect((await POST(req())).json()).resolves.toMatchObject({ active: true });
  });

  test("answers inactive, naming no account, for a revoked, expired, disabled or unknown key, without recording a use", async () => {
    (serviceAccountKeysTable.fetchByHash as jest.Mock).mockResolvedValue({ ...key, revoked_at: "2026-01-01T00:00:00Z" });
    await expect((await POST(req())).json()).resolves.toEqual({ active: false });
    (serviceAccountKeysTable.fetchByHash as jest.Mock).mockResolvedValue({ ...key, expires_at: "2020-01-01T00:00:00Z" });
    await expect((await POST(req())).json()).resolves.toEqual({ active: false });
    (serviceAccountKeysTable.fetchByHash as jest.Mock).mockResolvedValue(key);
    (accountsTable.fetchById as jest.Mock).mockResolvedValue({ account_id: "acme--nightly-sync", disabled: true });
    await expect((await POST(req())).json()).resolves.toEqual({ active: false });
    (serviceAccountKeysTable.fetchByHash as jest.Mock).mockResolvedValue(null);
    await expect((await POST(req())).json()).resolves.toEqual({ active: false });
    expect(serviceAccountKeysTable.set).not.toHaveBeenCalled();
  });

  test("is 401 for any subject but the proxy's own, or no assertion", async () => {
    (verifyProxyAssertion as jest.Mock).mockResolvedValue({ sub: "acme--nightly-sync" });
    expect((await POST(req())).status).toBe(401);
    (verifyProxyAssertion as jest.Mock).mockResolvedValue(null);
    expect((await POST(req())).status).toBe(401);
    expect(serviceAccountKeysTable.fetchByHash).not.toHaveBeenCalled();
  });

  test("is 400 for a body without a hex SHA-256", async () => {
    expect((await POST(req({ key_hash: "sck_notahash" }))).status).toBe(400);
    expect((await POST(req({}))).status).toBe(400);
    expect(serviceAccountKeysTable.fetchByHash).not.toHaveBeenCalled();
  });
});
