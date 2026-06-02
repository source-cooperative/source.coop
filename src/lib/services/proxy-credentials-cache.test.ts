/**
 * @jest-environment node
 */

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDelete = jest.fn();

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  }),
}));

const mockGetProxyCredentials = jest.fn();
jest.mock("@/lib/actions/proxy-credentials", () => ({
  getProxyCredentials: () => mockGetProxyCredentials(),
}));

const mockGetPageSession = jest.fn();
jest.mock("@/lib/api/utils", () => ({
  getPageSession: () => mockGetPageSession(),
}));

import {
  refreshProxyCredentials,
  clearCachedProxyCredentials,
} from "./proxy-credentials-cache";
import { encryptJson } from "./encrypted-cookie";

describe("proxy-credentials-cache", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockDelete.mockReset();
    mockGetProxyCredentials.mockReset();
    mockGetPageSession.mockReset();
    mockGetPageSession.mockResolvedValue({ identity_id: "user-1" });
  });

  const freshCreds = (offsetMs = 60 * 60 * 1000) => ({
    accessKeyId: "A",
    secretAccessKey: "S",
    sessionToken: "T",
    expiration: new Date(Date.now() + offsetMs).toISOString(),
  });

  test("returns ok:false without minting when unauthenticated", async () => {
    mockGetPageSession.mockResolvedValue(null);

    const result = await refreshProxyCredentials();

    expect(result).toEqual({ ok: false, minted: false });
    expect(mockGetProxyCredentials).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  test("mints and sets cookie on cache miss", async () => {
    mockGet.mockReturnValue(undefined);
    const creds = freshCreds();
    mockGetProxyCredentials.mockResolvedValue(creds);

    const result = await refreshProxyCredentials();

    expect(result).toEqual({
      ok: true,
      expiration: creds.expiration,
      minted: true,
    });
    expect(mockGetProxyCredentials).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledTimes(1);
    const [name, , options] = mockSet.mock.calls[0];
    expect(name).toBe("sc_proxy_creds");
    expect(options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    expect(options.maxAge).toBeGreaterThan(0);
  });

  test("returns early without minting when cookie is fresh", async () => {
    const creds = freshCreds();
    mockGet.mockReturnValue({ value: await encryptJson(creds) });

    const result = await refreshProxyCredentials();

    expect(result).toEqual({
      ok: true,
      expiration: creds.expiration,
      minted: false,
    });
    expect(mockGetProxyCredentials).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  test("re-mints when cached creds are close to expiring", async () => {
    const stale = freshCreds(60 * 1000); // within the 5-min refresh window
    mockGet.mockReturnValue({ value: await encryptJson(stale) });
    const fresh = freshCreds(60 * 60 * 1000);
    mockGetProxyCredentials.mockResolvedValue(fresh);

    const result = await refreshProxyCredentials();

    expect(result.minted).toBe(true);
    expect(result.expiration).toBe(fresh.expiration);
    expect(mockGetProxyCredentials).toHaveBeenCalledTimes(1);
  });

  test("re-mints when cookie is tampered", async () => {
    mockGet.mockReturnValue({ value: "garbage-not-a-real-cookie" });
    const creds = freshCreds();
    mockGetProxyCredentials.mockResolvedValue(creds);

    const result = await refreshProxyCredentials();

    expect(result.minted).toBe(true);
    expect(mockGetProxyCredentials).toHaveBeenCalledTimes(1);
  });

  test("concurrent mints are not coalesced (each re-mints; idempotent)", async () => {
    mockGet.mockReturnValue(undefined);
    mockGetProxyCredentials.mockResolvedValue(freshCreds());

    const [r1, r2] = await Promise.all([
      refreshProxyCredentials(),
      refreshProxyCredentials(),
    ]);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    // No in-process coalescing (serverless requests don't share a module
    // scope): both callers mint and write the cookie. Re-minting is idempotent.
    expect([r1.minted, r2.minted]).toEqual([true, true]);
    expect(mockGetProxyCredentials).toHaveBeenCalledTimes(2);
    expect(mockSet).toHaveBeenCalledTimes(2);
  });

  test("clearCachedProxyCredentials deletes the cookie", async () => {
    await clearCachedProxyCredentials();
    expect(mockDelete).toHaveBeenCalledWith("sc_proxy_creds");
  });
});
