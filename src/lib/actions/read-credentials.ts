"use server";

import { CONFIG } from "@/lib/config";
import { getPageSession } from "@/lib/api/utils";
import { getOryIdToken } from "@/lib/api/ory-id-token";
import { parseAssumeRoleWithWebIdentityResponse } from "@/lib/api/sts-response";
import { LOGGER } from "@/lib/logging";

export interface ReadCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: string;
}

/**
 * Obtains temporary S3 read credentials from the data proxy for the
 * currently authenticated user.
 */
export async function getReadCredentials(): Promise<ReadCredentials> {
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
      operation: "getReadCredentials",
      metadata: { status: resp.status, body },
    });
    throw new Error(`STS exchange failed: ${resp.status}`);
  }

  const xml = await resp.text();
  const creds = parseAssumeRoleWithWebIdentityResponse(xml);

  LOGGER.info("Issued read credentials", {
    operation: "getReadCredentials",
    metadata: { identity_id: session.identity_id, expiration: creds.expiration },
  });

  return creds;
}
