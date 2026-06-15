// Not a Server Action: this module is invoked only server-side (from the
// `refreshProxyCredentials` action), so it must NOT carry a file-level
// "use server" directive — that would publish `getProxyCredentials` as a
// public endpoint any authenticated user could POST to directly, each call
// driving the full Ory + STS request chain. `server-only` keeps it from ever
// being bundled into client code.
import "server-only";

import { CONFIG } from "@/lib/config";
import { LOGGER } from "@/lib/logging";

export interface ProxyCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: string;
}

/**
 * Ory and STS error responses can include backend implementation and state
 * details that are invaluable when debugging this multi-step flow locally or in
 * staging, but that we don't want persisted in production logs. Returns the
 * body for logging everywhere except production (where it is dropped).
 */
function debugBody(body: string): string | undefined {
  return CONFIG.environment.isProduction ? undefined : body;
}

/**
 * Throws (after logging the status and, outside production, the response body)
 * when an Ory/STS response is not OK. Centralizes the read-body / log / throw
 * handling shared by every step of the flow. `${label} failed` is used for both
 * the log message and the thrown error.
 */
async function assertOk(
  resp: Response,
  label: string,
  operation: string,
): Promise<void> {
  if (resp.ok) return;
  const body = await resp.text();
  LOGGER.error(`${label} failed`, {
    operation,
    metadata: { status: resp.status, body: debugBody(body) },
  });
  throw new Error(`${label} failed: ${resp.status}`);
}

/**
 * Obtains temporary S3 credentials from the data proxy for the given user.
 *
 * Flow:
 *   1. Drive Hydra's OAuth2 auth code flow server-side to get an ID token.
 *   2. Exchange the ID token at the data proxy's STS endpoint for credentials.
 *
 * SECURITY: `identityId` is trusted as-is. The Ory admin API accepts a login
 * for ANY subject, so this function mints valid credentials for whatever
 * identity it is handed — it is "become any user" if fed unverified input.
 * Callers MUST pass an identity taken from a verified session (e.g.
 * `(await getPageSession()).identity_id`), never from request parameters.
 */
export async function getProxyCredentials(
  identityId: string,
): Promise<ProxyCredentials> {
  if (!identityId) {
    throw new Error("Unauthorized: no verified identity provided");
  }

  const idToken = await getOryIdToken(identityId);

  const stsUrl = new URL(`${CONFIG.storage.endpoint}/.sts`);
  stsUrl.searchParams.set("Action", "AssumeRoleWithWebIdentity");
  stsUrl.searchParams.set("RoleArn", "_default");
  stsUrl.searchParams.set("WebIdentityToken", idToken);

  const stsController = new AbortController();
  const stsTimer = setTimeout(() => stsController.abort(), 15_000);
  const resp = await fetch(stsUrl.toString(), { signal: stsController.signal }).finally(
    () => clearTimeout(stsTimer),
  );
  await assertOk(resp, "STS exchange", "getProxyCredentials");

  const xml = await resp.text();
  return parseStsCredentials(xml);
}

// ---------------------------------------------------------------------------
// Ory Hydra OAuth2 auth code flow
// ---------------------------------------------------------------------------

/**
 * Drives a server-side OAuth2 authorization code flow against Ory Hydra,
 * using the admin API to accept login and consent challenges on behalf of
 * an already-authenticated user. Returns a Hydra-signed OIDC ID token.
 *
 * If the OAuth2 client has skip_consent enabled (recommended), the consent
 * step is skipped and the flow completes in 4 HTTP calls instead of 6.
 */
async function getOryIdToken(identityId: string): Promise<string> {
  const {
    api: { backendUrl },
    accessToken: adminApiKey,
    oauth2: { clientId, clientSecret, redirectUri },
  } = CONFIG.auth;

  if (!clientId || !clientSecret || !redirectUri || !backendUrl || !adminApiKey) {
    throw new Error("Incomplete Ory OAuth2 configuration");
  }

  const cookieJar = new Map<string, string>();

  // Step 1: Initiate the OAuth2 flow. This flow is driven entirely server-side
  // (no browser redirect), so a `state` token isn't needed for CSRF protection.
  // Hydra still requires one, though: fosite enforces a minimum-entropy check
  // (MinParameterEntropy, 8 chars) and rejects the /oauth2/auth request with
  // `invalid_state` if `state` is missing or too short — so we must send it. A
  // 36-char UUID clears that bound with room to spare.
  const state = crypto.randomUUID();

  const authUrl = new URL(`${backendUrl}/oauth2/auth`);
  // state satisfies fosite's minimum-entropy check but is not verified on
  // return: the entire flow is server-side with no browser redirect, so
  // there is no CSRF surface that state verification would protect.
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "openid");
  authUrl.searchParams.set("state", state);

  const authResp = await fetchWithCookies(authUrl.toString(), cookieJar, {
    redirect: "manual",
  });
  const loginChallenge = extractParam(authResp, "login_challenge");
  if (!loginChallenge) {
    throw new Error(
      `No login_challenge in /oauth2/auth redirect. Status: ${authResp.status}, Location: ${authResp.headers.get("location")}`,
    );
  }

  // Step 2: Accept the login challenge via admin API.
  const loginAcceptResp = await fetch(
    `${backendUrl}/admin/oauth2/auth/requests/login/accept?login_challenge=${encodeURIComponent(loginChallenge)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subject: identityId, remember: false }),
    },
  );
  await assertOk(loginAcceptResp, "Login accept", "getOryIdToken");
  const { redirect_to: loginRedirect } =
    (await loginAcceptResp.json()) as { redirect_to?: string };
  if (!loginRedirect) {
    throw new Error(`Login accept returned no redirect_to. Status: ${loginAcceptResp.status}`);
  }

  // Step 3: Follow the post-login redirect chain to obtain the authorization
  // code. With skip_consent enabled this resolves in one hop; otherwise it
  // passes through a consent challenge. resolveAuthCode bounds and origin-checks
  // every hop.
  assertHydraOrigin(loginRedirect, backendUrl);
  const postLoginResp = await fetchWithCookies(loginRedirect, cookieJar, {
    redirect: "manual",
  });
  const code = await resolveAuthCode(
    postLoginResp,
    loginRedirect,
    backendUrl,
    adminApiKey,
    cookieJar,
  );

  // Step 4: Exchange the authorization code for tokens.
  const tokenResp = await fetch(`${backendUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      // btoa throws on any code point > 255; encode UTF-8 bytes first so a
      // client secret with non-Latin-1 characters still produces a valid header.
      Authorization:
        "Basic " +
        Buffer.from(`${clientId}:${clientSecret}`, "utf-8").toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });
  await assertOk(tokenResp, "Token exchange", "getOryIdToken");
  const tokenBody = (await tokenResp.json()) as { id_token?: string };
  if (!tokenBody.id_token) {
    throw new Error("Token response did not include an id_token");
  }

  LOGGER.debug("Obtained Ory ID token", {
    operation: "getOryIdToken",
    metadata: { identityId },
  });

  return tokenBody.id_token;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Guard before following a Hydra `redirect_to` while carrying the session
 * cookie jar. The values come from Hydra's admin API and public auth endpoint
 * and are normally same-origin, but if Hydra is misconfigured (or compromised)
 * and points the redirect off-origin, forwarding the jar would leak live auth
 * state to an unintended host. Relative URLs are resolved against backendUrl.
 */
function assertHydraOrigin(redirectUrl: string, backendUrl: string): void {
  const resolvedOrigin = new URL(redirectUrl, backendUrl).origin;
  const expectedOrigin = new URL(backendUrl).origin;
  if (resolvedOrigin !== expectedOrigin) {
    throw new Error(`Unexpected redirect to untrusted host: ${resolvedOrigin}`);
  }
}

/**
 * Resolves the OAuth2 authorization code from Hydra's post-login redirect
 * chain, starting from an already-fetched response. With skip_consent the first
 * response already carries the `code`; otherwise it carries a `consent_challenge`
 * (accepted via the admin API) or another same-origin redirect to follow.
 *
 * Bounded to a few hops so a misbehaving redirect loop can't spin forever, and
 * every hop is origin-checked before the live session cookie jar is forwarded.
 * `base` resolves relative `Location` headers and advances with each hop.
 */
async function resolveAuthCode(
  initial: Response,
  base: string,
  backendUrl: string,
  adminApiKey: string,
  cookieJar: Map<string, string>,
): Promise<string> {
  let resp = initial;
  let from = base;

  for (let hop = 0; hop < 5; hop++) {
    const code = extractParam(resp, "code");
    if (code) return code;

    const consentChallenge = extractParam(resp, "consent_challenge");
    if (consentChallenge) {
      return acceptConsentAndGetCode(
        backendUrl,
        adminApiKey,
        consentChallenge,
        cookieJar,
      );
    }

    const location = resp.headers.get("location");
    if (!location) {
      throw new Error(
        `No consent_challenge or code after login accept. Status: ${resp.status}`,
      );
    }
    const next = new URL(location, from).toString();
    assertHydraOrigin(next, backendUrl);
    resp = await fetchWithCookies(next, cookieJar, { redirect: "manual" });
    from = next;
  }

  throw new Error("Too many redirects resolving the authorization code");
}

async function acceptConsentAndGetCode(
  backendUrl: string,
  adminApiKey: string,
  consentChallenge: string,
  cookieJar: Map<string, string>,
): Promise<string> {
  const consentAcceptResp = await fetch(
    `${backendUrl}/admin/oauth2/auth/requests/consent/accept?consent_challenge=${encodeURIComponent(consentChallenge)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ grant_scope: ["openid"], remember: false }),
    },
  );
  await assertOk(consentAcceptResp, "Consent accept", "acceptConsentAndGetCode");
  const { redirect_to: consentRedirect } =
    (await consentAcceptResp.json()) as { redirect_to?: string };
  if (!consentRedirect) {
    throw new Error(`Consent accept returned no redirect_to. Status: ${consentAcceptResp.status}`);
  }

  // Same-origin guard as the login redirect path: the cookie jar carries live
  // Hydra session state, so never forward it to a host outside Hydra's origin.
  assertHydraOrigin(consentRedirect, backendUrl);
  const codeResp = await fetchWithCookies(consentRedirect, cookieJar, {
    redirect: "manual",
  });
  const code = extractParam(codeResp, "code");
  if (!code) {
    throw new Error(
      `No authorization code after consent accept. Status: ${codeResp.status}, Location: ${codeResp.headers.get("location")}`,
    );
  }
  return code;
}

function parseStsCredentials(xml: string): ProxyCredentials {
  const credsBlock = xml.match(/<Credentials>([\s\S]*?)<\/Credentials>/)?.[1];
  if (!credsBlock) {
    throw new Error("STS response missing <Credentials> element");
  }

  const extract = (tag: string): string => {
    const match = credsBlock.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    if (!match) {
      throw new Error(`STS response missing <${tag}> element`);
    }
    // STS XML occasionally pads values with surrounding whitespace; trim so it
    // never leaks into the credential or the parsed Expiration.
    return match[1].trim();
  };

  const expiration = extract("Expiration");
  if (Number.isNaN(Date.parse(expiration))) {
    // A malformed Expiration would otherwise feed isFresh()/cookie maxAge as a
    // garbage date — fail loudly instead of caching unusable credentials.
    throw new Error(`STS response has an unparseable <Expiration>: ${expiration}`);
  }

  return {
    accessKeyId: extract("AccessKeyId"),
    secretAccessKey: extract("SecretAccessKey"),
    sessionToken: extract("SessionToken"),
    expiration,
  };
}

async function fetchWithCookies(
  url: string,
  cookieJar: Map<string, string>,
  init?: RequestInit,
): Promise<Response> {
  const cookieHeader = Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  const headers = new Headers(init?.headers);
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  const resp = await fetch(url, { ...init, headers });

  const setCookies = resp.headers.getSetCookie?.() ?? [];
  for (const sc of setCookies) {
    const match = sc.match(/^([^=]+)=([^;]*)/);
    if (match) {
      cookieJar.set(match[1], match[2]);
    }
  }

  return resp;
}

function extractParam(response: Response, param: string): string | null {
  const location = response.headers.get("location");
  if (!location) return null;
  try {
    const url = new URL(location, "https://placeholder.invalid");
    return url.searchParams.get(param);
  } catch {
    return null;
  }
}
