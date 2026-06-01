import { CONFIG } from "@/lib/config";
import { readProxyCredentials } from "@/lib/services/proxy-credentials-read";
import { S3StorageClient } from "@/lib/storage/s3";

/**
 * Build a per-request S3 client that acts on behalf of the current user:
 * signed with their proxy credentials when present, anonymous otherwise.
 * Must be called during a server render/action (reads the request cookie).
 */
export async function getStorageClient(): Promise<S3StorageClient> {
  const credentials = await readProxyCredentials();
  return new S3StorageClient({
    endpoint: CONFIG.storage.endpoint ?? "",
    credentials,
  });
}

export { S3StorageClient } from "@/lib/storage/s3";
