/**
 * @jest-environment node
 */

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

// The identity comparison reads the raw Ory session (getServerSession +
// getOryId), NOT getPageSession — the heavier helper would add account and
// membership DB reads the comparison doesn't need.
const mockGetServerSession = jest.fn();
jest.mock("@ory/nextjs/app", () => ({
  getServerSession: () => mockGetServerSession(),
}));

import { readProxyCredentials } from "./proxy-credentials-read";
import { encryptJson } from "./encrypted-cookie";

describe("readProxyCredentials", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockGetProxyCredentials.mockReset();
    mockGetServerSession.mockReset();
    mockGetServerSession.mockResolvedValue({ identity: { id: "user-1" } });
  });

  const freshCreds = (offsetMs = 60 * 60 * 1000) => ({
    accessKeyId: "A",
    secretAccessKey: "S",
    sessionToken: "T",
    expiration: new Date(Date.now() + offsetMs).toISOString(),
    identityId: "user-1",
  });

  test("returns decrypted creds when cookie is present, fresh, and owned by the session user", async () => {
    const creds = freshCreds();
    mockGet.mockReturnValue({ value: await encryptJson(creds) });

    expect(await readProxyCredentials()).toEqual(creds);
  });

  test("returns undefined when no cookie is present", async () => {
    mockGet.mockReturnValue(undefined);
    expect(await readProxyCredentials()).toBeUndefined();
  });

  test("does not resolve the session when there is no cookie", async () => {
    mockGet.mockReturnValue(undefined);
    await readProxyCredentials();

    expect(mockGetServerSession).not.toHaveBeenCalled();
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

  test("returns undefined when the cookie was minted for a different user", async () => {
    // User switch without /logout: user-1's still-fresh cookie remains in the
    // browser while user-2's session is active. It must not be served.
    const creds = freshCreds();
    mockGet.mockReturnValue({ value: await encryptJson(creds) });
    mockGetServerSession.mockResolvedValue({ identity: { id: "user-2" } });

    expect(await readProxyCredentials()).toBeUndefined();
  });

  test("returns undefined when a cookie is present but there is no session", async () => {
    const creds = freshCreds();
    mockGet.mockReturnValue({ value: await encryptJson(creds) });
    mockGetServerSession.mockResolvedValue(null);

    expect(await readProxyCredentials()).toBeUndefined();
  });

  test("returns undefined for a legacy cookie without an identity binding", async () => {
    // Cookies minted before identityId was added to the payload must be
    // treated as absent so the gate re-mints with the binding in place.
    const { identityId: _ignored, ...legacy } = freshCreds();
    mockGet.mockReturnValue({ value: await encryptJson(legacy) });

    expect(await readProxyCredentials()).toBeUndefined();
  });

  test("never mints credentials or writes a cookie", async () => {
    mockGet.mockReturnValue(undefined);
    await readProxyCredentials();

    expect(mockGetProxyCredentials).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });
});
