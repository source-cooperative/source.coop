/**
 * @jest-environment node
 */

const TEST_KEY = Buffer.alloc(32).toString("base64");

const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
  }),
}));

const mockGetProxyCredentials = jest.fn();
jest.mock("@/lib/actions/proxy-credentials", () => ({
  getProxyCredentials: () => mockGetProxyCredentials(),
}));

import { readProxyCredentials } from "./proxy-credentials-read";
import { encryptJson } from "./encrypted-cookie";

describe("readProxyCredentials", () => {
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
    mockGetProxyCredentials.mockReset();
  });

  const freshCreds = (offsetMs = 60 * 60 * 1000) => ({
    accessKeyId: "A",
    secretAccessKey: "S",
    sessionToken: "T",
    expiration: new Date(Date.now() + offsetMs).toISOString(),
  });

  test("returns decrypted creds when cookie is present and fresh", async () => {
    const creds = freshCreds();
    mockGet.mockReturnValue({ value: await encryptJson(creds) });

    expect(await readProxyCredentials()).toEqual(creds);
  });

  test("returns undefined when no cookie is present", async () => {
    mockGet.mockReturnValue(undefined);
    expect(await readProxyCredentials()).toBeUndefined();
  });

  test("returns undefined when the cookie is close to expiring", async () => {
    const stale = freshCreds(60 * 1000); // within the 5-min refresh window
    mockGet.mockReturnValue({ value: await encryptJson(stale) });

    expect(await readProxyCredentials()).toBeUndefined();
  });

  test("returns undefined on a tampered cookie", async () => {
    mockGet.mockReturnValue({ value: "garbage-not-a-real-cookie" });
    expect(await readProxyCredentials()).toBeUndefined();
  });

  test("never mints credentials or writes a cookie", async () => {
    mockGet.mockReturnValue(undefined);
    await readProxyCredentials();

    expect(mockGetProxyCredentials).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });
});
