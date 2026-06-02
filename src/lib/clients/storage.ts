import { CONFIG } from "@/lib/config";
import { readProxyCredentials } from "@/lib/services/proxy-credentials-read";
import { S3StorageClient } from "@/lib/storage/s3";
import type { ProxyCredentials } from "@/lib/actions/proxy-credentials";

/**
 * Build a per-request S3 client that acts on behalf of the current user:
 * signed with their proxy credentials when present, anonymous otherwise.
 * Must be called during a server render/action (reads the request cookie).
 *
 * Pass `credentials` when the caller already read them this request to avoid
 * decrypting the cookie twice; omit to read them here.
 */
export async function getStorageClient(
  credentials?: ProxyCredentials,
): Promise<S3StorageClient> {
  return new S3StorageClient({
    endpoint: CONFIG.storage.endpoint ?? "",
    credentials: credentials ?? (await readProxyCredentials()),
  });
}

export { S3StorageClient } from "@/lib/storage/s3";
