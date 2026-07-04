import "server-only";

import { Box, Skeleton } from "@radix-ui/themes";

import { LOGGER } from "@/lib";
import { fileSourceUrl } from "@/lib/urls";
import { getStorageClient } from "@/lib/clients/storage";
import { probeStore } from "@/lib/stores/probe";
import { PreviewIframe } from "./PreviewIframe";

interface StorePreviewProps {
  account_id: string;
  product_id: string;
  /** The store prefix relative to the product, e.g. `gfs.icechunk`. */
  object_path: string;
  /** Lowercased suffix: `zarr` or `icechunk`. */
  extension: string;
}

/**
 * Embeds the external zarr-viewer for a `.zarr` / `.icechunk` store — but only
 * after cheap server-side checks confirm the store is actually renderable
 * (see `probeStore`). When the checks don't pass we render nothing; the normal
 * directory listing beneath this component is always shown regardless, so the
 * store's files stay browsable. Rendered inside a Suspense boundary so the
 * probe never blocks the rest of the page.
 */
export async function StorePreview({
  account_id,
  product_id,
  object_path,
  extension,
}: StorePreviewProps) {
  const s3 = await getStorageClient();
  const probe = await probeStore({
    s3,
    account_id,
    product_id,
    storePath: object_path,
    extension,
  });

  if (!probe.renderable) {
    LOGGER.debug("Store not renderable; skipping viewer", {
      operation: "StorePreview",
      context: "store validation",
      metadata: { account_id, product_id, object_path, extension, reason: probe.reason },
    });
    return null;
  }

  const url = encodeURIComponent(
    fileSourceUrl({ account_id, product_id, object_path }),
  );
  return (
    <PreviewIframe
      src={`https://source-cooperative.github.io/zarr-viewer/?url=${url}`}
      style={{ border: "1px solid var(--gray-5)" }}
      title={`Preview of ${object_path}`}
    />
  );
}

export function StorePreviewLoading() {
  return (
    <Skeleton>
      <Box mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-6)" }}>
        <Box width="100%" height="600px" />
      </Box>
    </Skeleton>
  );
}
