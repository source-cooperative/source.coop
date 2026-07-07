import { Suspense } from "react";
import { Card } from "@radix-ui/themes";
import { getStorageClient } from "@/lib/clients/storage";
import { readProxyCredentials } from "@/lib/services/proxy-credentials-read";
import {
  ObjectPreview,
  ObjectPreviewLoading,
} from "@/components/features/products/object-browser/ObjectPreview";
import { getAuthorizedProduct } from "../data";

interface PageProps {
  params: Promise<{
    account_id: string;
    product_id: string;
    path?: string[];
  }>;
}

/**
 * Full-width object preview below the product grid (mirrors the @readme
 * slot). Renders only when the path is a file; directories, the product
 * root, credential gating, and backend failures are the main slot's story.
 */
export default async function ObjectPreviewSlot({ params }: PageProps) {
  const { account_id, product_id, path = [] } = await params;
  const objectPath = path.map((p) => decodeURIComponent(p)).join("/");
  if (!objectPath) return null;

  // Same gates as the main slot: authorize the viewer (notFound for those
  // who may not read the product), and for a restricted/disabled product
  // with no fresh proxy credentials render nothing while the main slot
  // shows the credentials gate.
  const product = await getAuthorizedProduct(account_id, product_id);
  const creds = await readProxyCredentials();
  if (!creds && (product.visibility === "restricted" || product.disabled)) {
    return null;
  }

  let isFile = false;
  try {
    const s3 = await getStorageClient(creds ?? null);
    const info = await s3.getObjectInfo({
      account_id,
      product_id,
      object_path: objectPath,
    });
    isFile = info?.type === "file";
  } catch {
    return null;
  }
  if (!isFile) return null;

  return (
    <Card mt="4">
      <Suspense fallback={<ObjectPreviewLoading />}>
        <ObjectPreview
          account_id={account_id}
          product_id={product_id}
          object_path={objectPath}
        />
      </Suspense>
    </Card>
  );
}
