/**
 * @jest-environment node
 */
import { getProxyCredentials } from "./proxy-credentials";

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

describe("getProxyCredentials", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    (LOGGER.error as jest.Mock).mockClear();
    CONFIG.environment.isProduction = false;
  });

  test("throws when called without a verified identity", async () => {
    await expect(getProxyCredentials("")).rejects.toThrow(/Unauthorized/);
    // Nothing must reach Ory for an empty subject.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("returns STS credentials for authenticated user", async () => {
    mockHydraFlowAndSts(fetchMock);

    const creds = await getProxyCredentials("ory-123");
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

  // Drives the 4-call skip_consent Hydra flow, then returns the given STS body.
  function mockHydraFlowEndingWithSts(body: string, status = 200) {
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postlogin" }),
      )
      .mockResolvedValueOnce(redirectResponse("https://source.coop/callback?code=c"))
      .mockResolvedValueOnce(jsonResponse({ id_token: "tok" }))
      .mockResolvedValueOnce(new Response(body, { status }));
  }

  test("trims whitespace from STS credential values", async () => {
    const xml = `<AssumeRoleWithWebIdentityResponse><AssumeRoleWithWebIdentityResult><Credentials><AccessKeyId>
      AKIAREAD
    </AccessKeyId><SecretAccessKey>  readsecret  </SecretAccessKey><SessionToken>
readsess
</SessionToken><Expiration>  2026-04-10T13:00:00Z  </Expiration></Credentials></AssumeRoleWithWebIdentityResult></AssumeRoleWithWebIdentityResponse>`;
    mockHydraFlowEndingWithSts(xml);

    const creds = await getProxyCredentials("ory-123");
    expect(creds).toEqual({
      accessKeyId: "AKIAREAD",
      secretAccessKey: "readsecret",
      sessionToken: "readsess",
      expiration: "2026-04-10T13:00:00Z",
    });
  });

  test("throws when the STS Expiration is not a parseable date", async () => {
    mockHydraFlowEndingWithSts(
      STS_XML.replace("2026-04-10T13:00:00Z", "not-a-real-date"),
    );
    await expect(getProxyCredentials("ory-123")).rejects.toThrow(/unparseable <Expiration>/);
  });

  test("encodes non-Latin-1 client credentials for the token-exchange Basic header", async () => {
    const prev = CONFIG.auth.oauth2.clientSecret;
    CONFIG.auth.oauth2.clientSecret = "sÉcret€"; // € is U+20AC (> 255) → btoa throws
    try {
      mockHydraFlowAndSts(fetchMock);
      // Would throw InvalidCharacterError if the code still used btoa().
      await expect(getProxyCredentials("ory-123")).resolves.toBeDefined();
      const tokenCall = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith("/oauth2/token"),
      );
      expect(tokenCall).toBeDefined();
      const headers = (tokenCall![1] as RequestInit).headers as Record<
        string,
        string
      >;
      const expected =
        "Basic " +
        Buffer.from(
          `${CONFIG.auth.oauth2.clientId}:sÉcret€`,
          "utf-8",
        ).toString("base64");
      expect(headers.Authorization).toBe(expected);
    } finally {
      CONFIG.auth.oauth2.clientSecret = prev;
    }
  });

  test("sends a sufficiently-long state on the /oauth2/auth request", async () => {
    // Hydra (fosite) enforces a minimum-entropy check and rejects the
    // /oauth2/auth request with `invalid_state` if `state` is missing or
    // shorter than 8 chars. Guard against a regression that drops it.
    mockHydraFlowAndSts(fetchMock);

    await getProxyCredentials("ory-123");

    const authUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(authUrl.pathname).toBe("/oauth2/auth");
    const state = authUrl.searchParams.get("state");
    expect(state).not.toBeNull();
    expect(state!.length).toBeGreaterThanOrEqual(8);
  });

  test("throws when STS returns non-200", async () => {
    fetchMock
      // Hydra flow (4 calls)
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/ui/login?login_challenge=lc" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ redirect_to: "https://auth.source.coop/x" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://source.coop/callback?code=c" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id_token: "tok" }), { status: 200 }))
      // STS fails
      .mockResolvedValueOnce(new Response("denied", { status: 403 }));

    await expect(getProxyCredentials("ory-123")).rejects.toThrow(/STS/);
  });

  test("completes the full consent flow when skip_consent is not enabled", async () => {
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

    const creds = await getProxyCredentials("ory-123");
    expect(creds.accessKeyId).toBe("AKIAREAD");
    // The consent challenge must have been accepted via the admin API.
    const consentCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/consent/accept"),
    );
    expect(consentCall).toBeDefined();
  });

  test("follows an intermediate same-origin redirect before obtaining the code", async () => {
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

    const creds = await getProxyCredentials("ory-123");
    expect(creds.accessKeyId).toBe("AKIAREAD");
  });

  test("rejects an intermediate redirect to an untrusted origin", async () => {
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postlogin" }),
      )
      // post-login redirect points off to an attacker-controlled host.
      .mockResolvedValueOnce(redirectResponse("https://evil.example.com/steal"));

    await expect(getProxyCredentials("ory-123")).rejects.toThrow(/untrusted host/);
    // The cookie jar must never be forwarded to the untrusted host.
    const leakedCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("evil.example.com"),
    );
    expect(leakedCall).toBeUndefined();
  });

  test("rejects an off-origin login redirect from the admin API", async () => {
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      // login/accept returns a redirect_to pointing off to an untrusted host.
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://evil.example.com/postlogin" }),
      );

    await expect(getProxyCredentials("ory-123")).rejects.toThrow(/untrusted host/);
    const leakedCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("evil.example.com"),
    );
    expect(leakedCall).toBeUndefined();
  });

  test("rejects an off-origin consent redirect from the admin API", async () => {
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postlogin" }),
      )
      .mockResolvedValueOnce(
        redirectResponse("https://auth.source.coop/consent?consent_challenge=cc"),
      )
      // consent/accept returns a redirect_to pointing off to an untrusted host.
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://evil.example.com/postconsent" }),
      );

    await expect(getProxyCredentials("ory-123")).rejects.toThrow(/untrusted host/);
    const leakedCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("evil.example.com"),
    );
    expect(leakedCall).toBeUndefined();
  });

  test("throws when /oauth2/auth returns no login_challenge", async () => {
    fetchMock.mockResolvedValueOnce(redirectResponse("/ui/login"));
    await expect(getProxyCredentials("ory-123")).rejects.toThrow(/login_challenge/);
  });

  test("throws when the login accept call fails", async () => {
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(new Response("nope", { status: 500 }));
    await expect(getProxyCredentials("ory-123")).rejects.toThrow(/Login accept failed/);
  });

  test("throws when the consent accept call fails", async () => {
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postlogin" }),
      )
      .mockResolvedValueOnce(
        redirectResponse("https://auth.source.coop/consent?consent_challenge=cc"),
      )
      .mockResolvedValueOnce(new Response("nope", { status: 500 }));
    await expect(getProxyCredentials("ory-123")).rejects.toThrow(/Consent accept failed/);
  });

  test("throws when no code is returned after consent accept", async () => {
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
    await expect(getProxyCredentials("ory-123")).rejects.toThrow(/No authorization code/);
  });

  test("throws when the post-login redirect has no usable parameters", async () => {
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postlogin" }),
      )
      // 302 with neither code, consent_challenge, nor a Location to follow.
      .mockResolvedValueOnce(redirectResponse(null));
    await expect(getProxyCredentials("ory-123")).rejects.toThrow(
      /No consent_challenge or code/,
    );
  });

  test("throws when the token exchange fails", async () => {
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postlogin" }),
      )
      .mockResolvedValueOnce(redirectResponse("https://source.coop/callback?code=c"))
      .mockResolvedValueOnce(new Response("bad", { status: 401 }));
    await expect(getProxyCredentials("ory-123")).rejects.toThrow(/Token exchange failed/);
  });

  test("throws when the token response has no id_token", async () => {
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postlogin" }),
      )
      .mockResolvedValueOnce(redirectResponse("https://source.coop/callback?code=c"))
      .mockResolvedValueOnce(jsonResponse({}));
    await expect(getProxyCredentials("ory-123")).rejects.toThrow(/id_token/);
  });

  test("throws when the STS response is missing the Credentials element", async () => {
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(
        jsonResponse({ redirect_to: "https://auth.source.coop/postlogin" }),
      )
      .mockResolvedValueOnce(redirectResponse("https://source.coop/callback?code=c"))
      .mockResolvedValueOnce(jsonResponse({ id_token: "tok" }))
      // 200 but malformed XML.
      .mockResolvedValueOnce(new Response("<Response>no creds</Response>", { status: 200 }));
    await expect(getProxyCredentials("ory-123")).rejects.toThrow(/missing <Credentials>/);
  });

  test("logs the Ory error body outside production", async () => {
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(new Response("backend detail", { status: 500 }));

    await expect(getProxyCredentials("ory-123")).rejects.toThrow(/Login accept failed/);

    const call = (LOGGER.error as jest.Mock).mock.calls.find(
      ([msg]) => msg === "Login accept failed",
    );
    expect(call).toBeDefined();
    expect(call[1].metadata.status).toBe(500);
    expect(call[1].metadata.body).toBe("backend detail");
  });

  test("omits the Ory error body from logs in production", async () => {
    CONFIG.environment.isProduction = true;
    fetchMock
      .mockResolvedValueOnce(redirectResponse("/ui/login?login_challenge=lc"))
      .mockResolvedValueOnce(
        new Response("super secret backend detail", { status: 500 }),
      );

    await expect(getProxyCredentials("ory-123")).rejects.toThrow(/Login accept failed/);

    const call = (LOGGER.error as jest.Mock).mock.calls.find(
      ([msg]) => msg === "Login accept failed",
    );
    expect(call).toBeDefined();
    // Status is still logged for diagnostics, but the raw body is dropped.
    expect(call[1].metadata.status).toBe(500);
    expect(call[1].metadata.body).toBeUndefined();
  });
});
