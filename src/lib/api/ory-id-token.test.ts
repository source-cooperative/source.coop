/**
 * @jest-environment node
 */
import { getOryIdToken } from "./ory-id-token";

jest.mock("@/lib/config", () => ({
  CONFIG: {
    auth: {
      api: { backendUrl: "https://auth.source.coop" },
      accessToken: "test-admin-key",
      oauth2: {
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        redirectUri: "https://source.coop/api/internal/oauth2/callback",
      },
    },
    environment: {
      isDevelopment: true,
    },
  },
}));

// JWT with exp = 9999999999 (far future), sub = "identity-xyz"
const MOCK_ID_TOKEN =
  "eyJhbGciOiJSUzI1NiJ9." +
  btoa(JSON.stringify({ sub: "identity-xyz", exp: 9999999999 })) +
  ".sig";

describe("getOryIdToken", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    // Clear the token cache between tests
    jest.resetModules();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("completes flow with skip_consent (4 calls)", async () => {
    // 1) GET /oauth2/auth → 302 with login_challenge
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location:
            "https://auth.source.coop/ui/login?login_challenge=login-123",
        },
      }),
    );

    // 2) PUT /admin/.../login/accept → { redirect_to }
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          redirect_to: "https://auth.source.coop/oauth2/auth?continue=1",
        }),
        { status: 200 },
      ),
    );

    // 3) Follow redirect → 302 straight to callback with code (consent skipped)
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location:
            "https://source.coop/api/internal/oauth2/callback?code=auth-code-789&state=abc",
        },
      }),
    );

    // 4) POST /oauth2/token → { id_token }
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id_token: MOCK_ID_TOKEN,
          access_token: "atok",
          token_type: "bearer",
          expires_in: 3600,
        }),
        { status: 200 },
      ),
    );

    const idToken = await getOryIdToken("identity-xyz");

    expect(idToken).toBe(MOCK_ID_TOKEN);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    // Verify login accept used the identity as subject
    const loginAcceptCall = fetchMock.mock.calls[1];
    expect(loginAcceptCall[0]).toContain("/admin/oauth2/auth/requests/login/accept");
    expect(loginAcceptCall[0]).toContain("login_challenge=login-123");
    const loginAcceptBody = JSON.parse(loginAcceptCall[1].body);
    expect(loginAcceptBody.subject).toBe("identity-xyz");
  });

  test("completes flow with consent step (6 calls)", async () => {
    // 1) GET /oauth2/auth → 302 with login_challenge
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location: "/ui/login?login_challenge=lc",
        },
      }),
    );

    // 2) PUT login/accept
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ redirect_to: "https://auth.source.coop/oauth2/auth?x=1" }),
        { status: 200 },
      ),
    );

    // 3) Follow redirect → consent_challenge
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location: "/ui/consent?consent_challenge=cc",
        },
      }),
    );

    // 4) PUT consent/accept
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ redirect_to: "https://auth.source.coop/oauth2/auth?y=1" }),
        { status: 200 },
      ),
    );

    // 5) Follow redirect → code
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location: "https://source.coop/callback?code=c",
        },
      }),
    );

    // 6) Token exchange
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ id_token: MOCK_ID_TOKEN }),
        { status: 200 },
      ),
    );

    // Use a different identity to avoid cache from previous test
    const idToken = await getOryIdToken("identity-with-consent");

    expect(idToken).toBe(MOCK_ID_TOKEN);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  test("throws when login_challenge is missing from redirect", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "https://auth.source.coop/ui/login" },
      }),
    );

    await expect(getOryIdToken("identity-no-challenge")).rejects.toThrow(
      /login_challenge/,
    );
  });

  test("throws when token response has no id_token", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "/ui/login?login_challenge=lc" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ redirect_to: "https://auth.source.coop/x" }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://source.coop/callback?code=c" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "atok" }), { status: 200 }),
      );

    await expect(getOryIdToken("identity-no-idtoken")).rejects.toThrow(
      /id_token/,
    );
  });

});
