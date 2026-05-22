/**
 * @jest-environment node
 */

const TEST_KEY = Buffer.alloc(32).toString("base64");

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

import {
  ensureProxyCredentials,
  clearCachedProxyCredentials,
} from "./proxy-credentials-cache";
import { encryptJson } from "./encrypted-cookie";

describe("proxy-credentials-cache", () => {
  const originalKey = process.env.PROXY_CREDS_COOKIE_KEY;

  beforeAll(() => {
    process.env.PROXY_CREDS_COOKIE_KEY = TEST_KEY;
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.PROXY_CREDS_COOKIE_KEY;
    } else {
      process.env.PROXY_CREDS_COOKIE_KEY = originalKey;
    }
  });

  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockDelete.mockReset();
    mockGetProxyCredentials.mockReset();
  });

  const freshCreds = (offsetMs = 60 * 60 * 1000) => ({
    accessKeyId: "A",
    secretAccessKey: "S",
    sessionToken: "T",
    expiration: new Date(Date.now() + offsetMs).toISOString(),
  });

  test("mints and sets cookie on cache miss", async () => {
    mockGet.mockReturnValue(undefined);
    const creds = freshCreds();
    mockGetProxyCredentials.mockResolvedValue(creds);

    const result = await ensureProxyCredentials("user-1");

    expect(result).toEqual(creds);
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

  test("returns cached creds on cookie hit without re-minting", async () => {
    const creds = freshCreds();
    const token = await encryptJson(creds);
    mockGet.mockReturnValue({ value: token });

    const result = await ensureProxyCredentials("user-2");

    expect(result).toEqual(creds);
    expect(mockGetProxyCredentials).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  test("re-mints when cached creds are close to expiring", async () => {
    const stale = freshCreds(60 * 1000); // expires in 1 min — within 5-min refresh window
    const token = await encryptJson(stale);
    mockGet.mockReturnValue({ value: token });

    const fresh = freshCreds(60 * 60 * 1000);
    mockGetProxyCredentials.mockResolvedValue(fresh);

    const result = await ensureProxyCredentials("user-3");

    expect(result).toEqual(fresh);
    expect(mockGetProxyCredentials).toHaveBeenCalledTimes(1);
  });

  test("re-mints when cookie is tampered", async () => {
    mockGet.mockReturnValue({ value: "garbage-not-a-real-cookie" });
    const creds = freshCreds();
    mockGetProxyCredentials.mockResolvedValue(creds);

    const result = await ensureProxyCredentials("user-4");

    expect(result).toEqual(creds);
    expect(mockGetProxyCredentials).toHaveBeenCalledTimes(1);
  });

  test("coalesces concurrent mints for the same session", async () => {
    mockGet.mockReturnValue(undefined);
    let resolve!: (v: ReturnType<typeof freshCreds>) => void;
    mockGetProxyCredentials.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );

    const p1 = ensureProxyCredentials("user-5");
    const p2 = ensureProxyCredentials("user-5");

    resolve(freshCreds());
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toEqual(r2);
    expect(mockGetProxyCredentials).toHaveBeenCalledTimes(1);
  });

  test("clearCachedProxyCredentials deletes the cookie", async () => {
    await clearCachedProxyCredentials();
    expect(mockDelete).toHaveBeenCalledWith("sc_proxy_creds");
  });
});
