import "server-only";

import { LOGGER } from "@/lib";
import { fileSourceUrl } from "@/lib/urls";
import { getStorageClient } from "@/lib/clients/storage";
import type { ProxyCredentials } from "@/lib/actions/proxy-credentials";
import { probeStore } from "@/lib/stores/probe";

interface StoreViewerArgs {
  account_id: string;
  product_id: string;
  /** The store prefix relative to the product, e.g. `gfs.icechunk`. */
  object_path: string;
  /** Lowercased suffix: `zarr` or `icechunk`. */
  extension: string;
  /**
   * Proxy credentials already resolved for this request (or `null` for none).
   * Threaded through so the probe's storage client reuses them instead of
   * re-reading the request cookie.
   */
  creds: ProxyCredentials | null;
}

/**
 * The external zarr-viewer URL for a `.zarr` / `.icechunk` store, or `null`
 * when cheap server-side checks say the store isn't actually renderable (see
 * `probeStore`). `null` means the preview card is skipped entirely; the normal
 * directory listing is shown regardless, so the store's files stay browsable.
 */
export async function storeViewerUrl({
  account_id,
  product_id,
  object_path,
  extension,
  creds,
}: StoreViewerArgs): Promise<string | null> {
  const s3 = await getStorageClient(creds);
  const probe = await probeStore({
    s3,
    account_id,
    product_id,
    storePath: object_path,
    extension,
  });

  if (!probe.renderable) {
    LOGGER.debug("Store not renderable; skipping viewer", {
      operation: "storeViewerUrl",
      context: "store validation",
      metadata: {
        account_id,
        product_id,
        object_path,
        extension,
        reason: probe.reason,
      },
    });
    return null;
  }

  const url = encodeURIComponent(
    fileSourceUrl({ account_id, product_id, object_path }),
  );
  return `https://source-cooperative.github.io/zarr-viewer/?url=${url}`;
}
