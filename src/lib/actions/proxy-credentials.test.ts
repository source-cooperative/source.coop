/**
 * @jest-environment node
 */
import { getProxyCredentials } from "./proxy-credentials";

jest.mock("@/lib/api/utils", () => ({ getPageSession: jest.fn() }));
jest.mock("@/lib/config", () => ({
  CONFIG: {
    storage: { endpoint: "https://data.source.coop" },
    environment: { isDevelopment: true },
    auth: {
      accessToken: "test-admin-key",
      api: { backendUrl: "https://auth.source.coop" },
      oauth2: {
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        redirectUri: "http://localhost:3000/api/internal/oauth2/callback",
      },
    },
  },
}));

import { getPageSession } from "@/lib/api/utils";

const STS_XML = `<AssumeRoleWithWebIdentityResponse><AssumeRoleWithWebIdentityResult><Credentials><AccessKeyId>AKIAREAD</AccessKeyId><SecretAccessKey>readsecret</SecretAccessKey><SessionToken>readsess</SessionToken><Expiration>2026-04-10T13:00:00Z</Expiration></Credentials></AssumeRoleWithWebIdentityResult></AssumeRoleWithWebIdentityResponse>`;

// Mock fetch responses for the full Hydra flow + STS exchange
function mockHydraFlowAndSts(fetchMock: jest.Mock) {
  fetchMock
    // Step 1: /oauth2/auth → login_challenge
    .mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "/ui/login?login_challenge=lc" },
      }),
    )
    // Step 2: login/accept → redirect_to
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ redirect_to: "https://auth.source.coop/x" }),
        { status: 200 },
      ),
    )
    // Step 3: follow redirect → code (skip_consent)
    .mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "https://source.coop/callback?code=c" },
      }),
    )
    // Step 4: token exchange → id_token
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ id_token: "mock-id-token" }),
        { status: 200 },
      ),
    )
    // Step 5: STS exchange → credentials XML
    .mockResolvedValueOnce(new Response(STS_XML, { status: 200 }));
}

describe("getProxyCredentials", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    (getPageSession as jest.Mock).mockReset();
  });

  test("throws when not authenticated", async () => {
    (getPageSession as jest.Mock).mockResolvedValue(null);
    await expect(getProxyCredentials()).rejects.toThrow(/Unauthorized/);
  });

  test("returns STS credentials for authenticated user", async () => {
    (getPageSession as jest.Mock).mockResolvedValue({
      identity_id: "ory-123",
      account: { account_id: "user-1" },
    });
    mockHydraFlowAndSts(fetchMock);

    const creds = await getProxyCredentials();
    expect(creds).toEqual({
      accessKeyId: "AKIAREAD",
      secretAccessKey: "readsecret",
      sessionToken: "readsess",
      expiration: "2026-04-10T13:00:00Z",
    });

    // Last fetch call should be the STS exchange
    const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0] as string;
    expect(lastCall).toContain("Action=AssumeRoleWithWebIdentity");
    expect(lastCall).toContain("RoleArn=_default");
  });

  test("throws when STS returns non-200", async () => {
    (getPageSession as jest.Mock).mockResolvedValue({
      identity_id: "ory-123",
      account: { account_id: "user-1" },
    });
    fetchMock
      // Hydra flow (4 calls)
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/ui/login?login_challenge=lc" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ redirect_to: "https://auth.source.coop/x" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://source.coop/callback?code=c" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id_token: "tok" }), { status: 200 }))
      // STS fails
      .mockResolvedValueOnce(new Response("denied", { status: 403 }));

    await expect(getProxyCredentials()).rejects.toThrow(/STS/);
  });
});
