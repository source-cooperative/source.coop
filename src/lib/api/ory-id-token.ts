import { CONFIG } from "@/lib/config";
import { LOGGER } from "@/lib/logging";
import { randomBytes } from "crypto";

/**
 * Drives a server-side OAuth2 authorization code flow against Ory Hydra,
 * using the admin API to accept login and consent challenges on behalf of
 * an already-authenticated user. Returns a Hydra-signed OIDC ID token.
 */
export async function getOryIdToken(identityId: string): Promise<string> {
  const {
    api: { backendUrl },
    accessToken: adminApiKey,
    oauth2: { clientId, clientSecret, redirectUri },
  } = CONFIG.auth;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "OAuth2 client is not configured; cannot issue Ory ID tokens",
    );
  }
  if (!backendUrl) {
    throw new Error("Ory backend URL is not configured");
  }
  if (!adminApiKey) {
    throw new Error("Ory admin API key is not configured");
  }

  const state = randomBytes(16).toString("hex");

  // Step 1: Initiate the OAuth2 flow
  const authUrl = new URL(`${backendUrl}/oauth2/auth`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "openid");
  authUrl.searchParams.set("state", state);

  const authResp = await fetch(authUrl.toString(), { redirect: "manual" });
  const loginChallenge = extractFromRedirect(authResp, "login_challenge");
  if (!loginChallenge) {
    throw new Error("No login_challenge in /oauth2/auth redirect");
  }

  // Step 2: Accept the login challenge as admin
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
  const loginAcceptBody = (await loginAcceptResp.json()) as {
    redirect_to: string;
  };

  // Step 3: Follow the returned redirect to get consent_challenge
  const consentResp = await fetch(loginAcceptBody.redirect_to, {
    redirect: "manual",
  });
  const consentChallenge = extractFromRedirect(
    consentResp,
    "consent_challenge",
  );
  if (!consentChallenge) {
    throw new Error("No consent_challenge in redirect after login accept");
  }

  // Step 4: Accept the consent challenge as admin
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
  const consentAcceptBody = (await consentAcceptResp.json()) as {
    redirect_to: string;
  };

  // Step 5: Follow the redirect to get the authorization code
  const codeResp = await fetch(consentAcceptBody.redirect_to, {
    redirect: "manual",
  });
  const code = extractFromRedirect(codeResp, "code");
  if (!code) {
    throw new Error("No authorization code in final redirect");
  }

  // Step 6: Exchange the code for tokens
  const tokenResp = await fetch(`${backendUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
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

function extractFromRedirect(
  response: Response,
  param: string,
): string | null {
  const location = response.headers.get("location");
  if (!location) return null;
  try {
    const url = new URL(location);
    return url.searchParams.get(param);
  } catch {
    return null;
  }
}
