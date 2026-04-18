"use server";

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { CONFIG } from "@/lib/config";
import { getPageSession } from "@/lib/api/utils";
import { getProxyCredentials } from "@/lib/actions/proxy-credentials";

const DEFAULT_EXPIRY_SECONDS = 3600; // 1 hour

/**
 * Generates a presigned URL for an object on the data proxy.
 * Uses the authenticated user's STS credentials to sign the URL.
 * For unauthenticated users, returns the raw (unsigned) URL.
 */
export async function getPresignedUrl({
  account_id,
  product_id,
  object_path,
  expiresIn = DEFAULT_EXPIRY_SECONDS,
}: {
  account_id: string;
  product_id: string;
  object_path: string;
  expiresIn?: number;
}): Promise<string> {
  const session = await getPageSession();

  // Anonymous users get the raw URL — public products are accessible without auth
  if (!session?.identity_id) {
    return `${CONFIG.storage.endpoint}/${account_id}/${product_id}/${object_path}`;
  }

  const creds = await getProxyCredentials();

  const client = new S3Client({
    endpoint: CONFIG.storage.endpoint,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
    },
  });

  const command = new GetObjectCommand({
    Bucket: account_id,
    Key: `${product_id}/${object_path}`,
  });

  return getSignedUrl(client, command, { expiresIn });
}
