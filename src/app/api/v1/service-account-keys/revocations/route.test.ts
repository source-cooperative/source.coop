/** @jest-environment node */
import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { serviceAccountKeysTable } from "@/lib/clients";
import { apiKeyChecksum } from "@/types";
import { POST } from "./route";

jest.mock("@/lib/clients", () => ({
  serviceAccountKeysTable: { fetchByHash: jest.fn(), revoke: jest.fn() },
}));

// A key of the issued shape, assembled at run time so secret scanners don't flag this file.
const KEY = `sck_${"A".repeat(30)}${apiKeyChecksum("A".repeat(30))}`;
const HASH = createHash("sha256").update(KEY).digest("hex");
const key = { key_hash: HASH, key_id: "k1", account_id: "acme--nightly-sync", label: "HPC", expires_at: null };
const ENDPOINT = "http://localhost/api/v1/service-account-keys/revocations";
const req = (body: unknown, url = ENDPOINT) =>
  new NextRequest(url, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

describe("POST /api/v1/service-account-keys/revocations", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (serviceAccountKeysTable.fetchByHash as jest.Mock).mockResolvedValue(key);
  });

  test("revokes a live key, found by the hash of the trimmed key, logs it without the key, and answers 204", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const res = await POST(req({ key: `${KEY}\n` }));
    expect(res.status).toBe(204);
    expect(serviceAccountKeysTable.fetchByHash).toHaveBeenCalledWith(HASH);
    expect(serviceAccountKeysTable.revoke).toHaveBeenCalledWith(HASH, "holder");
    const logged = warn.mock.calls.flat().join("\n");
    expect(logged).toContain('"key_id":"k1","account_id":"acme--nightly-sync"');
    expect(logged).not.toContain(KEY);
  });

  test("answers 204 without writing for a key already revoked", async () => {
    (serviceAccountKeysTable.fetchByHash as jest.Mock).mockResolvedValue({ ...key, revoked_at: "2026-01-01T00:00:00Z" });
    expect((await POST(req({ key: KEY }))).status).toBe(204);
    expect(serviceAccountKeysTable.revoke).not.toHaveBeenCalled();
  });

  test("answers 204 without writing for a key that does not exist", async () => {
    (serviceAccountKeysTable.fetchByHash as jest.Mock).mockResolvedValue(null);
    expect((await POST(req({ key: KEY }))).status).toBe(204);
    expect(serviceAccountKeysTable.revoke).not.toHaveBeenCalled();
  });

  test("is 400 for a key in the query string, before any lookup", async () => {
    expect((await POST(req({ key: KEY }, `${ENDPOINT}?key=${KEY}`))).status).toBe(400);
    expect(serviceAccountKeysTable.fetchByHash).not.toHaveBeenCalled();
  });

  test("is 400 for a body that holds no API key, before any lookup", async () => {
    const mistyped = `sck_B${KEY.slice(5)}`;
    for (const body of ["not json", {}, { key: 42 }, { key: "SCLEGACYKEY" }, { key: KEY.slice(0, -1) }, { key: mistyped }]) {
      expect((await POST(req(body))).status).toBe(400);
    }
    expect(serviceAccountKeysTable.fetchByHash).not.toHaveBeenCalled();
  });
});
