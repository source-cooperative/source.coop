import { Suspense, type ReactNode } from "react";
import { Box, Card, Flex, Link } from "@radix-ui/themes";
import { SectionHeader } from "@/components/core/SectionHeader";
import { getStorageClient } from "@/lib/clients/storage";
import { readProxyCredentials } from "@/lib/services/proxy-credentials-read";
import type { ProxyCredentials } from "@/lib/actions/proxy-credentials";
import { ObjectPreview } from "@/components/features/products/object-browser/ObjectPreview";
import { PreviewIframe } from "@/components/features/products/object-browser/PreviewIframe";
import { storeViewerUrl } from "@/components/features/products/object-browser/storeViewer";
import { getAuthorizedProduct } from "../data";
import { fileSourceUrl } from "@/lib/urls";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { getExtension, isStoreExtension } from "@/lib/files";
import { getIframeSrc } from "@/components/features/products/object-browser/ObjectPreviewExternal";

interface PageProps {
  params: Promise<{
    account_id: string;
    product_id: string;
    path?: string[];
  }>;
}

function previewCard(viewerUrl: string | null, children: ReactNode) {
  return (
    <Card mt="4">
      <SectionHeader
        title="Object Preview"
        rightButton={
          viewerUrl && (
            <Link
              href={viewerUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="1"
            >
              <Flex align="center" gap="1">
                Open in new tab
                <ExternalLinkIcon width="14" height="14" />
              </Flex>
            </Link>
          )
        }
      >
        <Box mt="4">{children}</Box>
      </SectionHeader>
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
    const viewerUrl = await storeViewerUrl({
      account_id,
      product_id,
      object_path,
      extension,
      creds: creds ?? null,
    });
    return viewerUrl
      ? previewCard(
          viewerUrl,
          <PreviewIframe
            src={viewerUrl}
            title={`Preview of ${object_path}`}
          />,
        )
      : null;
  }

  if (!(await isFile(account_id, product_id, object_path, creds ?? null))) {
    return null;
  }

  const viewerUrl = extension
    ? await getIframeSrc(
        fileSourceUrl({ account_id, product_id, object_path }),
        extension,
      )
    : null;

  return previewCard(
    viewerUrl,
    <Suspense fallback={null}>
      <ObjectPreview
        account_id={account_id}
        product_id={product_id}
        object_path={object_path}
      />
    </Suspense>,
  );
}
