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
 * Full-width object preview below the product grid (mirrors the @readme
 * slot), for both single files and `.zarr` / `.icechunk` stores. Renders only
 * when there's something to show; directories, the product root, credential
 * gating, and backend failures are the main slot's story.
 */
export default async function ObjectPreviewSlot({ params }: PageProps) {
  const { account_id, product_id, path = [] } = await params;
  // A trailing-slash URL (common for store prefixes: `.../store.zarr/`) yields
  // an empty final catch-all segment; strip it so the extension is readable.
  const object_path = path
    .map((p) => decodeURIComponent(p))
    .join("/")
    .replace(/\/$/, "");
  if (!object_path) return null;

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
    const store = await storeViewerUrl({
      account_id,
      product_id,
      object_path,
      extension,
      creds: creds ?? null,
    });
    if (!store) return null;
    return previewCard(
      store.url,
      storeLabelFromResult(store),
      <PreviewIframe src={store.url} title={`Preview of ${object_path}`} />,
    );
  }

  if (!(await isFile(account_id, product_id, object_path, creds ?? null))) {
    return null;
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
