"use server";

import { CONFIG } from "@/lib/config";
import { getPageSession } from "@/lib/api/utils";
import { LOGGER } from "@/lib/logging";

export interface ProxyCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: string;
}

/**
 * Obtains temporary S3 credentials from the data proxy for the
 * currently authenticated user.
 *
 * Flow:
 *   1. Verify the Ory session.
 *   2. Drive Hydra's OAuth2 auth code flow server-side to get an ID token.
 *   3. Exchange the ID token at the data proxy's STS endpoint for credentials.
 */
export async function getProxyCredentials(): Promise<ProxyCredentials> {
  const session = await getPageSession();
  if (!session?.identity_id) {
    throw new Error("Unauthorized: no active Ory session");
  }

  const idToken = await getOryIdToken(session.identity_id);

  const stsUrl = new URL(`${CONFIG.storage.endpoint}/.sts`);
  stsUrl.searchParams.set("Action", "AssumeRoleWithWebIdentity");
  stsUrl.searchParams.set("RoleArn", "_default");
  stsUrl.searchParams.set("WebIdentityToken", idToken);

  const resp = await fetch(stsUrl.toString());
  if (!resp.ok) {
    const body = await resp.text();
    LOGGER.error("STS exchange failed", {
      operation: "getProxyCredentials",
      metadata: { status: resp.status, body },
    });
    throw new Error(`STS exchange failed: ${resp.status}`);
  }

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

  const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Step 1: Initiate the OAuth2 flow.
  const authUrl = new URL(`${backendUrl}/oauth2/auth`);
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
  if (!loginAcceptResp.ok) {
    throw new Error(
      `Login accept failed: ${loginAcceptResp.status} ${await loginAcceptResp.text()}`,
    );
  }
  const { redirect_to: loginRedirect } =
    (await loginAcceptResp.json()) as { redirect_to: string };

  // Step 3: Follow the redirect. If skip_consent is enabled, this goes
  // straight to the callback with a code. Otherwise we get a consent_challenge.
  const postLoginResp = await fetchWithCookies(loginRedirect, cookieJar, {
    redirect: "manual",
  });

  let code = extractParam(postLoginResp, "code");

  if (!code) {
    const consentChallenge = extractParam(postLoginResp, "consent_challenge");
    if (!consentChallenge) {
      const location = postLoginResp.headers.get("location");
      if (location) {
        const resolvedUrl = new URL(location, loginRedirect).toString();
        const followResp = await fetchWithCookies(resolvedUrl, cookieJar, {
          redirect: "manual",
        });
        const followedCode = extractParam(followResp, "code");
        const followedChallenge = extractParam(followResp, "consent_challenge");
        if (followedCode) {
          code = followedCode;
        } else if (followedChallenge) {
          code = await acceptConsentAndGetCode(backendUrl, adminApiKey, followedChallenge, cookieJar);
        } else {
          throw new Error(
            `No consent_challenge or code after login accept. Status: ${followResp.status}, Location: ${followResp.headers.get("location")}`,
          );
        }
      } else {
        throw new Error(
          `No consent_challenge or code after login accept. Status: ${postLoginResp.status}`,
        );
      }
    } else {
      code = await acceptConsentAndGetCode(backendUrl, adminApiKey, consentChallenge, cookieJar);
    }
  }

  // Step 4: Exchange the authorization code for tokens.
  const tokenResp = await fetch(`${backendUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });
  if (!tokenResp.ok) {
    throw new Error(
      `Token exchange failed: ${tokenResp.status} ${await tokenResp.text()}`,
    );
  }
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
  if (!consentAcceptResp.ok) {
    throw new Error(
      `Consent accept failed: ${consentAcceptResp.status} ${await consentAcceptResp.text()}`,
    );
  }
  const { redirect_to: consentRedirect } =
    (await consentAcceptResp.json()) as { redirect_to: string };

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
    return match[1];
  };

  return {
    accessKeyId: extract("AccessKeyId"),
    secretAccessKey: extract("SecretAccessKey"),
    sessionToken: extract("SessionToken"),
    expiration: extract("Expiration"),
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
