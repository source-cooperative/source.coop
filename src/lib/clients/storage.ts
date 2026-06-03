import { CONFIG } from "@/lib/config";
import { readProxyCredentials } from "@/lib/services/proxy-credentials-read";
import { S3StorageClient } from "@/lib/storage/s3";
import type { ProxyCredentials } from "@/lib/actions/proxy-credentials";

/**
 * Build a per-request S3 client that acts on behalf of the current user:
 * signed with their proxy credentials when present, anonymous otherwise.
 * Must be called during a server render/action (reads the request cookie).
 *
 * When the caller already resolved credentials this request, pass them — a
 * `ProxyCredentials`, or `null` to mean "resolved, but none" — to avoid reading
 * the cookie a second time. Omit the argument entirely to read here. A plain
 * `?? readProxyCredentials()` fallback can't distinguish an explicit `undefined`
 * from an omitted argument, so it would re-read on an explicit "no credentials".
 */
export async function getStorageClient(
  credentials?: ProxyCredentials | null,
): Promise<S3StorageClient> {
  const resolved =
    credentials === undefined
      ? await readProxyCredentials()
      : (credentials ?? undefined);
  return new S3StorageClient({
    endpoint: CONFIG.storage.endpoint ?? "",
    credentials: resolved,
  });
}

export { S3StorageClient } from "@/lib/storage/s3";
