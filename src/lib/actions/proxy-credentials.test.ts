/**
 * @jest-environment node
 */
import { getProxyCredentials } from "./proxy-credentials";

jest.mock("@/lib/api/utils", () => ({ getPageSession: jest.fn() }));
jest.mock("@/lib/logging", () => ({
  LOGGER: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));
jest.mock("@/lib/config", () => ({
  CONFIG: {
    storage: { endpoint: "https://data.source.coop" },
    environment: { isDevelopment: true, isProduction: false },
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
import { LOGGER } from "@/lib/logging";
import { CONFIG } from "@/lib/config";

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

// A 302 carrying (or omitting) a Location header.
const redirectResponse = (location: string | null) =>
  new Response(null, {
    status: 302,
    headers: location ? { location } : {},
  });
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

const AUTHED_SESSION = {
  identity_id: "ory-123",
  account: { account_id: "user-1" },
};

describe("getProxyCredentials", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    (getPageSession as jest.Mock).mockReset();
    (LOGGER.error as jest.Mock).mockClear();
    CONFIG.environment.isProduction = false;
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

  test("completes the full consent flow when skip_consent is not enabled", async () => {
    (getPageSession as jest.Mock).mockResolvedValue(AUTHED_SESSION);
    fetchMock
      // /oauth2/auth → login_challenge
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      // login/accept → redirect_to
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postlogin" }),
      )
      // post-login redirect → consent_challenge (no code: skip_consent disabled)
      .mockResolvedValueOnce(
        redirectResponse("https://auth.source.coop/consent?consent_challenge=cc"),
      )
      // consent/accept → redirect_to
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postconsent" }),
      )
      // post-consent redirect → code
      .mockResolvedValueOnce(redirectResponse("https://source.coop/callback?code=c"))
      // token exchange → id_token
      .mockResolvedValueOnce(jsonResponse({ id_token: "tok" }))
      // STS exchange → credentials
      .mockResolvedValueOnce(new Response(STS_XML, { status: 200 }));

    const creds = await getProxyCredentials();
    expect(creds.accessKeyId).toBe("AKIAREAD");
    // The consent challenge must have been accepted via the admin API.
    const consentCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/consent/accept"),
    );
    expect(consentCall).toBeDefined();
  });

  test("follows an intermediate same-origin redirect before obtaining the code", async () => {
    (getPageSession as jest.Mock).mockResolvedValue(AUTHED_SESSION);
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postlogin" }),
      )
      // post-login redirect → neither code nor consent_challenge, but a
      // same-origin Location to follow.
      .mockResolvedValueOnce(redirectResponse("https://auth.source.coop/intermediate"))
      // following it yields the code.
      .mockResolvedValueOnce(redirectResponse("https://source.coop/callback?code=c"))
      .mockResolvedValueOnce(jsonResponse({ id_token: "tok" }))
      .mockResolvedValueOnce(new Response(STS_XML, { status: 200 }));

    const creds = await getProxyCredentials();
    expect(creds.accessKeyId).toBe("AKIAREAD");
  });

  test("rejects an intermediate redirect to an untrusted origin", async () => {
    (getPageSession as jest.Mock).mockResolvedValue(AUTHED_SESSION);
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postlogin" }),
      )
      // post-login redirect points off to an attacker-controlled host.
      .mockResolvedValueOnce(redirectResponse("https://evil.example.com/steal"));

    await expect(getProxyCredentials()).rejects.toThrow(/untrusted host/);
    // The cookie jar must never be forwarded to the untrusted host.
    const leakedCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("evil.example.com"),
    );
    expect(leakedCall).toBeUndefined();
  });

  test("throws when /oauth2/auth returns no login_challenge", async () => {
    (getPageSession as jest.Mock).mockResolvedValue(AUTHED_SESSION);
    fetchMock.mockResolvedValueOnce(redirectResponse("/ui/login"));
    await expect(getProxyCredentials()).rejects.toThrow(/login_challenge/);
  });

  test("throws when the login accept call fails", async () => {
    (getPageSession as jest.Mock).mockResolvedValue(AUTHED_SESSION);
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(new Response("nope", { status: 500 }));
    await expect(getProxyCredentials()).rejects.toThrow(/Login accept failed/);
  });

  test("throws when the consent accept call fails", async () => {
    (getPageSession as jest.Mock).mockResolvedValue(AUTHED_SESSION);
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postlogin" }),
      )
      .mockResolvedValueOnce(
        redirectResponse("https://auth.source.coop/consent?consent_challenge=cc"),
      )
      .mockResolvedValueOnce(new Response("nope", { status: 500 }));
    await expect(getProxyCredentials()).rejects.toThrow(/Consent accept failed/);
  });

  test("throws when no code is returned after consent accept", async () => {
    (getPageSession as jest.Mock).mockResolvedValue(AUTHED_SESSION);
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postlogin" }),
      )
      .mockResolvedValueOnce(
        redirectResponse("https://auth.source.coop/consent?consent_challenge=cc"),
      )
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postconsent" }),
      )
      // post-consent redirect with no code.
      .mockResolvedValueOnce(redirectResponse("https://source.coop/callback"));
    await expect(getProxyCredentials()).rejects.toThrow(/No authorization code/);
  });

  test("throws when the post-login redirect has no usable parameters", async () => {
    (getPageSession as jest.Mock).mockResolvedValue(AUTHED_SESSION);
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postlogin" }),
      )
      // 302 with neither code, consent_challenge, nor a Location to follow.
      .mockResolvedValueOnce(redirectResponse(null));
    await expect(getProxyCredentials()).rejects.toThrow(
      /No consent_challenge or code/,
    );
  });

  test("throws when the token exchange fails", async () => {
    (getPageSession as jest.Mock).mockResolvedValue(AUTHED_SESSION);
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postlogin" }),
      )
      .mockResolvedValueOnce(redirectResponse("https://source.coop/callback?code=c"))
      .mockResolvedValueOnce(new Response("bad", { status: 401 }));
    await expect(getProxyCredentials()).rejects.toThrow(/Token exchange failed/);
  });

  test("throws when the token response has no id_token", async () => {
    (getPageSession as jest.Mock).mockResolvedValue(AUTHED_SESSION);
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postlogin" }),
      )
      .mockResolvedValueOnce(redirectResponse("https://source.coop/callback?code=c"))
      .mockResolvedValueOnce(jsonResponse({}));
    await expect(getProxyCredentials()).rejects.toThrow(/id_token/);
  });

  test("throws when the STS response is missing the Credentials element", async () => {
    (getPageSession as jest.Mock).mockResolvedValue(AUTHED_SESSION);
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postlogin" }),
      )
      .mockResolvedValueOnce(redirectResponse("https://source.coop/callback?code=c"))
      .mockResolvedValueOnce(jsonResponse({ id_token: "tok" }))
      // 200 but malformed XML.
      .mockResolvedValueOnce(new Response("<Response>no creds</Response>", { status: 200 }));
    await expect(getProxyCredentials()).rejects.toThrow(/missing <Credentials>/);
  });

  test("logs the Ory error body outside production", async () => {
    (getPageSession as jest.Mock).mockResolvedValue(AUTHED_SESSION);
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(new Response("backend detail", { status: 500 }));

    await expect(getProxyCredentials()).rejects.toThrow(/Login accept failed/);

    const call = (LOGGER.error as jest.Mock).mock.calls.find(
      ([msg]) => msg === "Login accept failed",
    );
    expect(call).toBeDefined();
    expect(call[1].metadata.status).toBe(500);
    expect(call[1].metadata.body).toBe("backend detail");
  });

  test("omits the Ory error body from logs in production", async () => {
    CONFIG.environment.isProduction = true;
    (getPageSession as jest.Mock).mockResolvedValue(AUTHED_SESSION);
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(
        new Response("super secret backend detail", { status: 500 }),
      );

    await expect(getProxyCredentials()).rejects.toThrow(/Login accept failed/);

    const call = (LOGGER.error as jest.Mock).mock.calls.find(
      ([msg]) => msg === "Login accept failed",
    );
    expect(call).toBeDefined();
    // Status is still logged for diagnostics, but the raw body is dropped.
    expect(call[1].metadata.status).toBe(500);
    expect(call[1].metadata.body).toBeUndefined();
  });
});
