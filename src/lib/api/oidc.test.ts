import { SignJWT, exportJWK, generateKeyPair, importJWK } from "jose";
import { authenticateWithOidcToken } from "./oidc";

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
    oidc: {
      issuerUrl: "https://data.test.source.coop",
      audience: "https://test.source.coop",
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

import {
  accountsTable,
  membershipsTable,
  isIndividualAccount,
} from "@/lib/clients/database";

// We need to mock getJwks behavior. Since createRemoteJWKSet is called at module level
// lazily, we'll use jest.spyOn approach by mocking the jose module's createRemoteJWKSet.
// Instead, we'll use a __mocks__ approach or mock the internal function.

// Mock createRemoteJWKSet by providing a module-level mock
const mockJwksFunction = jest.fn();
jest.mock("jose", () => {
  // We need to return a manual mock that re-exports the real functions
  // but replaces createRemoteJWKSet
  return {
    __esModule: true,
    // These will be resolved at test time via the real module
    get jwtVerify() {
      return jest.requireActual<typeof import("jose")>("jose").jwtVerify;
    },
    get SignJWT() {
      return jest.requireActual<typeof import("jose")>("jose").SignJWT;
    },
    get exportJWK() {
      return jest.requireActual<typeof import("jose")>("jose").exportJWK;
    },
    get generateKeyPair() {
      return jest.requireActual<typeof import("jose")>("jose").generateKeyPair;
    },
    get importJWK() {
      return jest.requireActual<typeof import("jose")>("jose").importJWK;
    },
    createRemoteJWKSet: (...args: unknown[]) => mockJwksFunction(...args),
  };
});

describe("authenticateWithOidcToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up the mock JWKS to return a function that resolves our test public key
    mockJwksFunction.mockReturnValue(async () => {
      return importJWK(publicJwk, "RS256");
    });
  });

  test("returns null for non-Bearer authorization", async () => {
    const result = await authenticateWithOidcToken("some-api-secret");
    expect(result).toBeNull();
  });

  test("returns null for null authorization", async () => {
    const result = await authenticateWithOidcToken(null);
    expect(result).toBeNull();
  });

  test("returns null for invalid JWT", async () => {
    const result = await authenticateWithOidcToken("Bearer invalid.jwt.token");
    expect(result).toBeNull();
  });

  test("returns null for wrong issuer", async () => {
    const token = await createToken(
      { sub: "test-user" },
      { issuer: "https://evil.com" }
    );
    const result = await authenticateWithOidcToken(`Bearer ${token}`);
    expect(result).toBeNull();
  });

  test("returns null for wrong audience", async () => {
    const token = await createToken(
      { sub: "test-user" },
      { audience: "https://wrong.com" }
    );
    const result = await authenticateWithOidcToken(`Bearer ${token}`);
    expect(result).toBeNull();
  });

  test("returns null for expired token", async () => {
    const token = await createToken(
      { sub: "test-user" },
      { expiresIn: "-1m" }
    );
    const result = await authenticateWithOidcToken(`Bearer ${token}`);
    expect(result).toBeNull();
  });

  test("returns null when account not found", async () => {
    (accountsTable.fetchById as jest.Mock).mockResolvedValue(null);
    const token = await createToken({ sub: "nonexistent-user" });
    const result = await authenticateWithOidcToken(`Bearer ${token}`);
    expect(result).toBeNull();
  });

  test("returns null when account is disabled", async () => {
    (accountsTable.fetchById as jest.Mock).mockResolvedValue({
      account_id: "test-user",
      disabled: true,
    });
    (isIndividualAccount as unknown as jest.Mock).mockReturnValue(true);
    const token = await createToken({ sub: "test-user" });
    const result = await authenticateWithOidcToken(`Bearer ${token}`);
    expect(result).toBeNull();
  });

  test("returns null when account is not individual", async () => {
    (accountsTable.fetchById as jest.Mock).mockResolvedValue({
      account_id: "test-org",
      disabled: false,
    });
    (isIndividualAccount as unknown as jest.Mock).mockReturnValue(false);
    const token = await createToken({ sub: "test-org" });
    const result = await authenticateWithOidcToken(`Bearer ${token}`);
    expect(result).toBeNull();
  });

  test("returns null when sub claim is missing", async () => {
    const token = await createToken({});
    const result = await authenticateWithOidcToken(`Bearer ${token}`);
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
    const result = await authenticateWithOidcToken(`Bearer ${token}`);

    expect(result).not.toBeNull();
    expect(result!.identity_id).toBe("ory-123");
    expect(result!.account).toEqual(mockAccount);
    expect(result!.memberships).toEqual(mockMemberships);
    expect(accountsTable.fetchById).toHaveBeenCalledWith("test-user");
  });
});
