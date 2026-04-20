/**
 * @jest-environment node
 */

import {
  SignJWT,
  exportJWK,
  generateKeyPair,
  importJWK,
  type FlattenedJWSInput,
  type JWSHeaderParameters,
} from "jose";
import { authenticateWithOidcToken, _setJwks } from "./oidc";

// Generate a test RSA key pair
let privateKey: CryptoKey;
let publicJwk: JsonWebKey & { kid?: string; alg?: string; use?: string };

beforeAll(async () => {
  const { privateKey: priv, publicKey: pub } = await generateKeyPair("RS256");
  privateKey = priv;
  const jwk = await exportJWK(pub);
  jwk.kid = "test-key-1";
  jwk.alg = "RS256";
  jwk.use = "sig";
  publicJwk = jwk;
});

const ISSUER = "https://data.test.source.coop";
const AUDIENCE = "https://test.source.coop";

// Helper to create a signed JWT
async function createToken(
  claims: Record<string, unknown> = {},
  options: { issuer?: string; audience?: string; expiresIn?: string } = {}
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "test-key-1" })
    .setIssuer(options.issuer ?? ISSUER)
    .setAudience(options.audience ?? AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? "5m")
    .sign(privateKey);
}

// Mock config
jest.mock("@/lib/config", () => ({
  CONFIG: {
    storage: {
      endpoint: "https://data.test.source.coop",
    },
    environment: {
      isDevelopment: true,
    },
    auth: {
      accessToken: "",
    },
  },
}));

// Mock database lookups
jest.mock("@/lib/clients/database", () => ({
  accountsTable: {
    fetchById: jest.fn(),
  },
  membershipsTable: {
    listByUser: jest.fn(),
  },
  isIndividualAccount: jest.fn(),
}));

jest.mock("@/lib/api/authz", () => ({
  isAuthorized: jest.fn().mockReturnValue(true),
}));

import { isAuthorized } from "@/lib/api/authz";

import {
  accountsTable,
  membershipsTable,
  isIndividualAccount,
} from "@/lib/clients/database";

describe("authenticateWithOidcToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Inject a local JWKS resolver that returns our test public key
    _setJwks(
      async (_protectedHeader: JWSHeaderParameters, _token: FlattenedJWSInput) => {
        return importJWK(publicJwk, "RS256");
      }
    );
  });

  afterAll(() => {
    // Clean up the injected JWKS
    _setJwks(null);
  });

  test("returns null for non-Bearer authorization", async () => {
    const result = await authenticateWithOidcToken("some-api-secret", AUDIENCE);
    expect(result).toBeNull();
  });

  test("returns null for null authorization", async () => {
    const result = await authenticateWithOidcToken(null, AUDIENCE);
    expect(result).toBeNull();
  });

  test("returns null for invalid JWT", async () => {
    const result = await authenticateWithOidcToken("Bearer invalid.jwt.token", AUDIENCE);
    expect(result).toBeNull();
  });

  test("returns null for wrong issuer", async () => {
    const token = await createToken(
      { sub: "test-user" },
      { issuer: "https://evil.com" }
    );
    const result = await authenticateWithOidcToken(`Bearer ${token}`, AUDIENCE);
    expect(result).toBeNull();
  });

  test("returns null for wrong audience", async () => {
    const token = await createToken(
      { sub: "test-user" },
      { audience: "https://wrong.com" }
    );
    const result = await authenticateWithOidcToken(`Bearer ${token}`, AUDIENCE);
    expect(result).toBeNull();
  });

  test("returns null for expired token", async () => {
    const token = await createToken(
      { sub: "test-user" },
      { expiresIn: "-1m" }
    );
    const result = await authenticateWithOidcToken(`Bearer ${token}`, AUDIENCE);
    expect(result).toBeNull();
  });

  test("returns null when account not found", async () => {
    (accountsTable.fetchById as jest.Mock).mockResolvedValue(null);
    const token = await createToken({ sub: "nonexistent-user" });
    const result = await authenticateWithOidcToken(`Bearer ${token}`, AUDIENCE);
    expect(result).toBeNull();
  });

  test("returns null when account is disabled", async () => {
    (accountsTable.fetchById as jest.Mock).mockResolvedValue({
      account_id: "test-user",
      disabled: true,
    });
    (isIndividualAccount as unknown as jest.Mock).mockReturnValue(true);
    const token = await createToken({ sub: "test-user" });
    const result = await authenticateWithOidcToken(`Bearer ${token}`, AUDIENCE);
    expect(result).toBeNull();
  });

  test("returns UserSession for valid token with org account", async () => {
    const mockOrgAccount = {
      account_id: "test-org",
      disabled: false,
      type: "organization",
      name: "Test Org",
      flags: [],
    };

    (accountsTable.fetchById as jest.Mock).mockResolvedValue(mockOrgAccount);
    (isIndividualAccount as unknown as jest.Mock).mockReturnValue(false);

    const token = await createToken({ sub: "test-org" });
    const result = await authenticateWithOidcToken(`Bearer ${token}`, AUDIENCE);

    expect(result).not.toBeNull();
    expect(result!.identity_id).toBeNull();
    expect(result!.account).toEqual(mockOrgAccount);
    expect(result!.memberships).toEqual([]);
    expect(membershipsTable.listByUser).not.toHaveBeenCalled();
  });

  test("returns null when sub claim is missing", async () => {
    const token = await createToken({});
    const result = await authenticateWithOidcToken(`Bearer ${token}`, AUDIENCE);
    expect(result).toBeNull();
  });

  test("returns UserSession for valid token with valid account", async () => {
    const mockAccount = {
      account_id: "test-user",
      identity_id: "ory-123",
      disabled: false,
      type: "individual",
      name: "Test User",
      flags: [],
    };
    const mockMemberships = [{ membership_id: "m1" }];

    (accountsTable.fetchById as jest.Mock).mockResolvedValue(mockAccount);
    (isIndividualAccount as unknown as jest.Mock).mockReturnValue(true);
    (membershipsTable.listByUser as jest.Mock).mockResolvedValue(
      mockMemberships
    );

    const token = await createToken({ sub: "test-user" });
    const result = await authenticateWithOidcToken(`Bearer ${token}`, AUDIENCE);

    expect(result).not.toBeNull();
    expect(result!.identity_id).toBe("ory-123");
    expect(result!.account).toEqual(mockAccount);
    expect(result!.memberships).toEqual(mockMemberships);
    expect(accountsTable.fetchById).toHaveBeenCalledWith("test-user");
  });

  test("filters memberships through isAuthorized", async () => {
    const mockAccount = {
      account_id: "test-user",
      identity_id: "ory-123",
      disabled: false,
      type: "individual",
      name: "Test User",
      flags: [],
    };
    const authorizedMembership = { membership_id: "m1" };
    const unauthorizedMembership = { membership_id: "m2" };

    (accountsTable.fetchById as jest.Mock).mockResolvedValue(mockAccount);
    (isIndividualAccount as unknown as jest.Mock).mockReturnValue(true);
    (membershipsTable.listByUser as jest.Mock).mockResolvedValue([
      authorizedMembership,
      unauthorizedMembership,
    ]);
    // Only authorize the first membership
    (isAuthorized as jest.Mock)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const token = await createToken({ sub: "test-user" });
    const result = await authenticateWithOidcToken(`Bearer ${token}`, AUDIENCE);

    expect(result).not.toBeNull();
    expect(result!.memberships).toEqual([authorizedMembership]);
    expect(isAuthorized).toHaveBeenCalledTimes(2);
  });

  test("returns null when storage endpoint is not configured", async () => {
    // Temporarily override the config mock
    const { CONFIG } = require("@/lib/config");
    const originalEndpoint = CONFIG.storage.endpoint;
    CONFIG.storage.endpoint = "";

    const token = await createToken({ sub: "test-user" });
    const result = await authenticateWithOidcToken(`Bearer ${token}`, AUDIENCE);

    expect(result).toBeNull();

    // Restore
    CONFIG.storage.endpoint = originalEndpoint;
  });
});
