import { Suspense, type ReactNode } from "react";
import { Card } from "@radix-ui/themes";
import { getStorageClient } from "@/lib/clients/storage";
import { readProxyCredentials } from "@/lib/services/proxy-credentials-read";
import type { ProxyCredentials } from "@/lib/actions/proxy-credentials";
import { ObjectPreview } from "@/components/features/products/object-browser/ObjectPreview";
import { PreviewIframe } from "@/components/features/products/object-browser/PreviewIframe";
import { storeViewerUrl, storeLabelFromResult } from "@/components/features/products/object-browser/storeViewer";
import { getAuthorizedProduct } from "../data";
import { fileSourceUrl } from "@/lib/urls";
import { getExtension, isStoreExtension } from "@/lib/files";
import { storeFormatFromListing } from "@/lib/stores/markers";
import { getIframeSrc, fileTypeLabel } from "@/components/features/products/object-browser/ObjectPreviewExternal";
import { ObjectPreviewCard } from "@/components/features/products/object-browser/ObjectPreviewCard";

interface PageProps {
  params: Promise<{
    account_id: string;
    product_id: string;
    path?: string[];
  }>;
}

function previewCard(
  viewerUrl: string | null,
  label: string | null,
  children: ReactNode,
) {
  return (
    <Card mt="4">
      <ObjectPreviewCard viewerUrl={viewerUrl} label={label}>
        {children}
      </ObjectPreviewCard>
    </Card>
  );
}

async function isFile(
  account_id: string,
  product_id: string,
  object_path: string,
  creds: ProxyCredentials | null,
): Promise<boolean> {
  try {
    const s3 = await getStorageClient(creds);
    const info = await s3.getObjectInfo({
      account_id,
      product_id,
      object_path,
    });
    return info?.type === "file";
  } catch {
    return false;
  }
}

/**
 * The store a directory (`""` for the product root) looks like from its own
 * listing, or `null` when it has no store markers or can't be listed.
 */
async function storeFormatOfDirectory(
  account_id: string,
  product_id: string,
  object_path: string,
  creds: ProxyCredentials | null,
): Promise<"icechunk" | "zarr" | null> {
  const prefix = object_path
    ? `${product_id}/${object_path}/`
    : `${product_id}/`;
  try {
    const s3 = await getStorageClient(creds);
    const listing = await s3.listObjects({ bucket: account_id, prefix });
    return storeFormatFromListing({
      objects: listing.objects.map((o) => o.key.slice(prefix.length)),
      directories: listing.directories.map((d) =>
        d.slice(prefix.length).replace(/\/$/, ""),
      ),
    });
  } catch {
    return null;
  }
}

async function storePreview(
  account_id: string,
  product_id: string,
  object_path: string,
  extension: string,
  creds: ProxyCredentials | null,
) {
  const store = await storeViewerUrl({
    account_id,
    product_id,
    object_path,
    extension,
    creds,
  });
  if (!store) return null;
  return previewCard(
    store.url,
    storeLabelFromResult(store),
    <PreviewIframe
      src={store.url}
      title={`Preview of ${object_path || product_id}`}
    />,
  );
}

/**
 * Full-width object preview below the product grid (mirrors the @readme
 * slot), for single files and for Zarr / Icechunk stores. Renders only when
 * there's something to show; credential gating and backend failures are the
 * main slot's story.
 */
export default async function ObjectPreviewSlot({ params }: PageProps) {
  const { account_id, product_id, path = [] } = await params;
  // A trailing-slash URL (common for store prefixes: `.../store.zarr/`) yields
  // an empty final catch-all segment; strip it so the extension is readable.
  const object_path = path
    .map((p) => decodeURIComponent(p))
    .join("/")
    .replace(/\/$/, "");

  // Same gates as the main slot: authorize the viewer (notFound for those who
  // may not read the product), and for a restricted/disabled product with no
  // fresh proxy credentials render nothing while the main slot shows the
  // credentials gate.
  const product = await getAuthorizedProduct(account_id, product_id);
  const creds = await readProxyCredentials();
  if (!creds && (product.visibility === "restricted" || product.disabled)) {
    return null;
  }

  const extension = getExtension(object_path);

  // A store is a key prefix, not a single object, so it's gated on the store
  // probe rather than a HEAD. The main slot still lists its contents.
  if (isStoreExtension(extension)) {
    return storePreview(account_id, product_id, object_path, extension, creds ?? null);
  }

  // Anything that isn't a single object is a directory, and a directory of any
  // name may be a store's root. Its own listing shows the markers, so only a
  // directory that has them pays for the probe.
  if (
    !object_path ||
    !(await isFile(account_id, product_id, object_path, creds ?? null))
  ) {
    const format = await storeFormatOfDirectory(
      account_id,
      product_id,
      object_path,
      creds ?? null,
    );
    return format
      ? storePreview(account_id, product_id, object_path, format, creds ?? null)
      : null;
  }

  const sourceUrl = fileSourceUrl({ account_id, product_id, object_path });
  const [viewerUrl, label] = extension
    ? await Promise.all([
        getIframeSrc(sourceUrl, extension),
        fileTypeLabel(sourceUrl, extension),
      ])
    : [null, null];

  return previewCard(
    viewerUrl,
    label,
    <Suspense fallback={null}>
      <ObjectPreview
        account_id={account_id}
        product_id={product_id}
        object_path={object_path}
      />
    </Suspense>,
  );
}
