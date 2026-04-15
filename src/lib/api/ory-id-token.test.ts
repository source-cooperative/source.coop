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

describe("getOryIdToken", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("drives full auth code flow and returns id_token", async () => {
    // 1) GET /oauth2/auth → 302 with login_challenge in redirect URL
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location:
            "https://auth.source.coop/ui/login?login_challenge=login-123",
        },
      }),
    );

    // 2) PUT /admin/oauth2/auth/requests/login/accept → { redirect_to }
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          redirect_to: "https://auth.source.coop/oauth2/auth?continue=login",
        }),
        { status: 200 },
      ),
    );

    // 3) Follow redirect → 302 with consent_challenge
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location:
            "https://auth.source.coop/ui/consent?consent_challenge=consent-456",
        },
      }),
    );

    // 4) PUT /admin/oauth2/auth/requests/consent/accept → { redirect_to }
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          redirect_to: "https://auth.source.coop/oauth2/auth?continue=consent",
        }),
        { status: 200 },
      ),
    );

    // 5) Follow redirect → 302 with code
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location:
            "https://source.coop/api/internal/oauth2/callback?code=auth-code-789&state=abc",
        },
      }),
    );

    // 6) POST /oauth2/token → { id_token }
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id_token: "eyJhbGci.payload.sig",
          access_token: "atok",
          token_type: "bearer",
          expires_in: 3600,
        }),
        { status: 200 },
      ),
    );

    const idToken = await getOryIdToken("identity-xyz");

    expect(idToken).toBe("eyJhbGci.payload.sig");
    expect(fetchMock).toHaveBeenCalledTimes(6);

    // Verify the login accept call used the identity as subject
    const loginAcceptCall = fetchMock.mock.calls[1];
    expect(loginAcceptCall[0]).toContain(
      "/admin/oauth2/auth/requests/login/accept",
    );
    expect(loginAcceptCall[0]).toContain("login_challenge=login-123");
    const loginAcceptBody = JSON.parse(loginAcceptCall[1].body);
    expect(loginAcceptBody.subject).toBe("identity-xyz");
  });

  test("throws when login_challenge is missing from redirect", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "https://auth.source.coop/ui/login" },
      }),
    );

    await expect(getOryIdToken("identity-xyz")).rejects.toThrow(
      /login_challenge/,
    );
  });

  test("throws when token response has no id_token", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: {
            location:
              "https://auth.source.coop/ui/login?login_challenge=lc",
          },
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
          headers: {
            location:
              "https://auth.source.coop/ui/consent?consent_challenge=cc",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ redirect_to: "https://auth.source.coop/y" }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: {
            location:
              "https://source.coop/api/internal/oauth2/callback?code=c",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "atok" }), {
          status: 200,
        }),
      );

    await expect(getOryIdToken("identity-xyz")).rejects.toThrow(/id_token/);
  });
});
