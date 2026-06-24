"use server";

import { redirect } from "next/navigation";
import { CONFIG } from "@/lib/config";
import { LOGGER } from "@/lib/logging";

/**
 * Server action backing the device-verification form (RFC 8628).
 *
 * Ory Hydra has no hosted UI for the device flow, so this app provides one:
 * Hydra redirects the user's browser to `urls.device.verification` (our
 * `/device` page) with a `device_challenge`, the user enters the `user_code`
 * shown in their terminal, and we accept it via Hydra's admin API. Hydra then
 * returns a `redirect_to` that runs the normal login/consent flow (reusing the
 * Account Experience UIs) before landing on `urls.device.success`.
 *
 * On a bad/expired code we bounce back to `/device` with an `error` marker so
 * the page can render a message — keeping the page a pure Server Component with
 * no client-side state.
 */
export async function acceptDeviceCode(formData: FormData): Promise<void> {
  const deviceChallenge = String(formData.get("device_challenge") ?? "");
  const userCode = String(formData.get("user_code") ?? "").trim();

  const {
    api: { backendUrl },
    accessToken: adminApiKey,
  } = CONFIG.auth;
  if (!backendUrl || !adminApiKey) {
    throw new Error("Incomplete Ory configuration");
  }

  const back = (error: string) =>
    `/device?device_challenge=${encodeURIComponent(deviceChallenge)}&error=${error}`;

  if (!deviceChallenge || !userCode) {
    redirect(back("missing"));
  }

  // Accept the user code via Hydra's admin API. Endpoint/shape mirror the
  // login/consent accepts in lib/actions/proxy-credentials.ts.
  const resp = await fetch(
    `${backendUrl}/admin/oauth2/auth/requests/device/accept?device_challenge=${encodeURIComponent(deviceChallenge)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_code: userCode }),
    },
  );

  if (!resp.ok) {
    const body = await resp.text();
    LOGGER.error("Device user-code accept failed", {
      operation: "acceptDeviceCode",
      metadata: {
        status: resp.status,
        // Hydra error bodies can carry flow detail useful outside production.
        body: CONFIG.environment.isProduction ? undefined : body,
      },
    });
    redirect(back("invalid"));
  }

  const { redirect_to: redirectTo } = (await resp.json()) as {
    redirect_to?: string;
  };
  if (!redirectTo) {
    throw new Error("Device accept returned no redirect_to");
  }

  // Hydra's redirect_to is normally same-origin; refuse to bounce the browser
  // to an unexpected host if Hydra is misconfigured (mirrors assertHydraOrigin
  // in proxy-credentials.ts).
  if (new URL(redirectTo, backendUrl).origin !== new URL(backendUrl).origin) {
    throw new Error("Device accept redirected to an untrusted host");
  }

  redirect(redirectTo);
}
