"use server";

import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { Actions } from "@/types";
import { CONFIG, productsTable } from "@/lib";
import { getProxyCredentials } from "@/lib/actions/proxy-credentials";
import { readProxyCredentials } from "@/lib/services/proxy-credentials-read";

export interface TemporaryCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: string;
  /** Data proxy endpoint the browser S3 client uploads to. */
  endpoint: string;
  bucket: string;
  region: string;
  prefix: string;
}

export interface GetCredentialsParams {
  accountId: string;
  productId: string;
}

/**
 * Mint temporary credentials for the in-browser uploader.
 *
 * Returns STS credentials from the data proxy's STS endpoint, scoped to the
 * caller's identity, plus the proxy endpoint and the path coordinates the
 * browser uploads to: bucket = accountId, prefix = `${productId}/`. The proxy
 * fronts every backend (S3, GCP, Azure), so a single path-style S3 client
 * uploads to all of them through the proxy — no per-provider branching here.
 *
 * Reuses the user's cached proxy-credentials cookie when one is still fresh
 * (the read path warms it for restricted products); otherwise mints fresh via
 * the Ory + STS flow. The browser caches the result per scope, so this runs
 * about once per "edit mode" enable.
 */
export async function getTemporaryCredentials({
  accountId,
  productId,
}: GetCredentialsParams): Promise<TemporaryCredentials> {
  // Authenticate user
  const session = await getPageSession();
  if (!session?.account || !session.identity_id) {
    throw new Error("Unauthorized: No valid session");
  }

  // Check authorization
  const product = await productsTable.fetchById(accountId, productId);
  if (!product)
    throw new Error(
      `Product ${accountId}/${productId} not found for temporary credentials`,
    );

  if (!isAuthorized(session, product, Actions.WriteRepositoryData))
    throw new Error(
      `Unauthorized: User does not have permission to upload to ${accountId}/${productId}`,
    );

  const endpoint = CONFIG.storage.endpoint;
  if (!endpoint) throw new Error("Storage endpoint is not configured");

  // Reuse the read path's cached cookie when fresh; mint otherwise. The
  // identity comes from the verified session — the only safe input to
  // getProxyCredentials (see its security note).
  const creds =
    (await readProxyCredentials()) ??
    (await getProxyCredentials(session.identity_id));

  return {
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    sessionToken: creds.sessionToken,
    expiration: creds.expiration,
    endpoint,
    bucket: accountId,
    region: CONFIG.storage.region ?? "us-east-1",
    prefix: `${productId}/`,
  };
}
