/**
 * @jest-environment node
 */

import {
  SignJWT,
  exportJWK,
  generateKeyPair,
  importJWK,
  type JWTPayload,
} from "jose";
import {
  _setOryJwks,
  authenticateWithOryAccessToken,
  isOryToken,
  oryIssuers,
} from "./ory-access-token";

const ORY = "https://auth.test.source.coop";
const AUDIENCE = "https://test.source.coop";

jest.mock("@/lib/config", () => ({
  CONFIG: {
    storage: { endpoint: "https://data.test.source.coop" },
    environment: { isTest: true },
    auth: { accessToken: "", oauth2: { issuer: "https://auth.test.source.coop" } },
  },
}));

jest.mock("@/lib/clients/database", () => ({
  accountsTable: { fetchByOryId: jest.fn(), fetchById: jest.fn() },
  membershipsTable: { listByUser: jest.fn() },
}));

jest.mock("@/lib/api/authz", () => ({
  isAuthorized: jest.fn().mockReturnValue(true),
}));

import { accountsTable, membershipsTable } from "@/lib/clients/database";

let privateKey: CryptoKey;

beforeAll(async () => {
  const { privateKey: priv, publicKey } = await generateKeyPair("RS256");
  privateKey = priv;
  const jwk = { ...(await exportJWK(publicKey)), kid: "ory-1", alg: "RS256" };
  _setOryJwks(async () => importJWK(jwk, "RS256"));
});

afterAll(() => _setOryJwks(null));

beforeEach(() => {
  jest.clearAllMocks();
  (accountsTable.fetchByOryId as jest.Mock).mockResolvedValue({
    account_id: "alice",
    identity_id: "ory-alice",
    disabled: false,
    type: "individual",
  });
  (membershipsTable.listByUser as jest.Mock).mockResolvedValue([
    { membership_id: "m1", account_id: "alice", membership_account_id: "org" },
  ]);
});

/** An access token as Ory signs one, with these claims overridden. */
function accessToken(
  claims: JWTPayload = {},
  o: { issuer?: string; audience?: string | string[]; expiresIn?: string } = {},
) {
  return new SignJWT({ client_id: "cli", scp: ["openid", "offline_access"], ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "ory-1" })
    .setSubject((claims.sub as string) ?? "ory-alice")
    .setIssuer(o.issuer ?? ORY)
    .setAudience(o.audience ?? [AUDIENCE])
    .setIssuedAt()
    .setExpirationTime(o.expiresIn ?? "5m")
    .sign(privateKey);
}

describe("isOryToken", () => {
  test("recognises Ory's issuer, with or without a trailing slash", async () => {
    expect(oryIssuers()).toEqual([ORY, `${ORY}/`]);
    expect(isOryToken(await accessToken())).toBe(true);
    expect(isOryToken(await accessToken({}, { issuer: `${ORY}/` }))).toBe(true);
  });

  test("leaves the proxy's tokens and non-JWTs to the other verifier", async () => {
    const proxy = await accessToken({}, { issuer: "https://data.test.source.coop" });
    expect(isOryToken(proxy)).toBe(false);
    expect(isOryToken("sck_not-a-jwt")).toBe(false);
    expect(isOryToken("")).toBe(false);
  });
});

describe("authenticateWithOryAccessToken", () => {
  test("resolves the person and their memberships", async () => {
    const session = await authenticateWithOryAccessToken(await accessToken(), AUDIENCE);
    expect(accountsTable.fetchByOryId).toHaveBeenCalledWith("ory-alice");
    expect(session?.account?.account_id).toBe("alice");
    expect(session?.identity_id).toBe("ory-alice");
    expect(session?.memberships).toHaveLength(1);
  });

  test("accepts an issuer with a trailing slash", async () => {
    const token = await accessToken({}, { issuer: `${ORY}/` });
    expect(await authenticateWithOryAccessToken(token, AUDIENCE)).not.toBeNull();
  });

  test("rejects an ID token, which Ory issues to the client, not the API", async () => {
    const idToken = await accessToken({}, { audience: "cli" });
    expect(await authenticateWithOryAccessToken(idToken, AUDIENCE)).toBeNull();
  });

  test("rejects a token for another audience", async () => {
    const token = await accessToken({}, { audience: "https://elsewhere.example" });
    expect(await authenticateWithOryAccessToken(token, AUDIENCE)).toBeNull();
  });

  test("rejects an expired token", async () => {
    const token = await accessToken({}, { expiresIn: "-1m" });
    expect(await authenticateWithOryAccessToken(token, AUDIENCE)).toBeNull();
  });

  test("rejects a token signed by another key", async () => {
    const { privateKey: other } = await generateKeyPair("RS256");
    const forged = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "ory-1" })
      .setSubject("ory-alice")
      .setIssuer(ORY)
      .setAudience(AUDIENCE)
      .setExpirationTime("5m")
      .sign(other);
    expect(await authenticateWithOryAccessToken(forged, AUDIENCE)).toBeNull();
  });

  test("rejects a token whose subject is no account", async () => {
    (accountsTable.fetchByOryId as jest.Mock).mockResolvedValue(null);
    expect(await authenticateWithOryAccessToken(await accessToken(), AUDIENCE)).toBeNull();
  });

  test("never resolves a subject as a service account", async () => {
    (accountsTable.fetchByOryId as jest.Mock).mockResolvedValue(null);
    await authenticateWithOryAccessToken(await accessToken({ sub: "svc-bot" }), AUDIENCE);
    expect(accountsTable.fetchById).not.toHaveBeenCalled();
  });

  test("rejects a disabled account", async () => {
    (accountsTable.fetchByOryId as jest.Mock).mockResolvedValue({
      account_id: "alice",
      identity_id: "ory-alice",
      disabled: true,
    });
    expect(await authenticateWithOryAccessToken(await accessToken(), AUDIENCE)).toBeNull();
  });
});
