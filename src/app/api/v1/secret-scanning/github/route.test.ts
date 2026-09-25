/** @jest-environment node */
import { createHash, generateKeyPairSync, sign, type KeyObject } from "crypto";
import { NextRequest } from "next/server";
import { serviceAccountKeysTable } from "@/lib/clients";
import { POST } from "./route";

jest.mock("@/lib/clients", () => ({
  serviceAccountKeysTable: { fetchByHash: jest.fn(), set: jest.fn() },
}));

// Throwaway P-256 pairs standing in for GitHub's signing keys.
const github = generateKeyPairSync("ec", { namedCurve: "P-256" });
const rotated = generateKeyPairSync("ec", { namedCurve: "P-256" });
const published = (...keys: [string, KeyObject][]) =>
  Response.json({
    public_keys: keys.map(([key_identifier, key]) => ({
      key_identifier,
      key: key.export({ type: "spki", format: "pem" }),
      is_current: true,
    })),
  });

const LIVE = `sck_${"L".repeat(43)}`;
const UNKNOWN = `sck_${"U".repeat(43)}`;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const report = (...tokens: string[]) =>
  JSON.stringify(
    tokens.map((token) => ({
      token,
      type: "source_coop_api_key",
      url: "https://github.com/octocat/Hello-World/blob/main/.env",
      source: "content",
    }))
  );
const ENDPOINT = "http://localhost/api/v1/secret-scanning/github";
const req = (body: string, { id = "k1", key = github.privateKey, signed = body } = {}) =>
  new NextRequest(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "github-public-key-identifier": id,
      "github-public-key-signature": sign("sha256", Buffer.from(signed), key).toString("base64"),
    },
    body,
  });

describe("POST /api/v1/secret-scanning/github", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(global, "fetch").mockImplementation(async () => published(["k1", github.publicKey]));
    (serviceAccountKeysTable.fetchByHash as jest.Mock).mockImplementation(async (hash: string) =>
      hash === sha256(LIVE) ? { key_hash: hash, key_id: "key-1", account_id: "acme--nightly-sync" } : null
    );
  });

  test("revokes each API key reported and labels it: true_positive if it exists, false_positive if not", async () => {
    const res = await POST(req(report(LIVE, UNKNOWN)));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([
      { token_raw: LIVE, token_type: "source_coop_api_key", label: "true_positive" },
      { token_raw: UNKNOWN, token_type: "source_coop_api_key", label: "false_positive" },
    ]);
    expect(serviceAccountKeysTable.set).toHaveBeenCalledTimes(1);
    expect(serviceAccountKeysTable.set).toHaveBeenCalledWith(sha256(LIVE), "revoked_at", expect.any(String));
  });

  test("ignores tokens that are not API keys", async () => {
    const res = await POST(req(report(`ghp_${"x".repeat(36)}`, "sck_tooshort", `${LIVE}x`)));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([]);
    expect(serviceAccountKeysTable.fetchByHash).not.toHaveBeenCalled();
  });

  test("is 401 for a missing or bad signature, and revokes nothing", async () => {
    const body = report(LIVE);
    const refused = [
      new NextRequest(ENDPOINT, { method: "POST", body }),
      req(body, { key: generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey }),
      req(body, { signed: report(UNKNOWN) }),
      req(body, { id: "not-a-github-key" }),
    ];
    for (const request of refused) expect((await POST(request)).status).toBe(401);
    expect(serviceAccountKeysTable.fetchByHash).not.toHaveBeenCalled();
    expect(serviceAccountKeysTable.set).not.toHaveBeenCalled();
  });

  test("is 400 for a signed body that is not a list of matches", async () => {
    expect((await POST(req("not json"))).status).toBe(400);
    expect((await POST(req(JSON.stringify({ token: LIVE })))).status).toBe(400);
  });

  test("keeps GitHub's keys, fetching them again only for an identifier it has not seen", async () => {
    await POST(req(report()));
    (global.fetch as jest.Mock).mockClear();
    (global.fetch as jest.Mock).mockImplementation(async () =>
      published(["k1", github.publicKey], ["k2", rotated.publicKey])
    );
    expect((await POST(req(report()))).status).toBe(200);
    expect(global.fetch).not.toHaveBeenCalled();
    expect((await POST(req(report(), { id: "k2", key: rotated.privateKey }))).status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("accepts the signed sample request from GitHub's documentation", async () => {
    const id = "bcb53661c06b4728e59d897fb6165d5c9cda0fd9cdf9d09ead458168deb7518c";
    (global.fetch as jest.Mock).mockImplementation(async () =>
      Response.json({
        public_keys: [
          {
            key_identifier: id,
            key: "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEYAGMWO8XgCamYKMJS6jc/qgvSlAd\nAjPuDPRcXU22YxgBrz+zoN19MzuRyW87qEt9/AmtoNP5GrobzUvQSyJFVw==\n-----END PUBLIC KEY-----\n",
            is_current: true,
          },
        ],
      })
    );
    const res = await POST(
      new NextRequest(ENDPOINT, {
        method: "POST",
        headers: {
          "github-public-key-identifier": id,
          "github-public-key-signature":
            "MEQCIQDaMKqrGnE27S0kgMrEK0eYBmyG0LeZismAEz/BgZyt7AIfXt9fErtRS4XaeSt/AO1RtBY66YcAdjxji410VQV4xg==",
        },
        body: '[{"source":"commit","token":"some_token","type":"some_type","url":"https://example.com/base-repo-url/"}]',
      })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([]);
  });
});
