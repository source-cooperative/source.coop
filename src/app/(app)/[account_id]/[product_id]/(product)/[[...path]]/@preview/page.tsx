import { Suspense } from "react";
import { Card, Flex, Link } from "@radix-ui/themes";
import { SectionHeader } from "@/components/core/SectionHeader";
import { getStorageClient } from "@/lib/clients/storage";
import { readProxyCredentials } from "@/lib/services/proxy-credentials-read";
import { ObjectPreview } from "@/components/features/products/object-browser/ObjectPreview";
import { getAuthorizedProduct } from "../data";
import { fileSourceUrl } from "@/lib/urls";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { getExtension } from "@/lib/files";
import { getIframeSrc } from "@/components/features/products/object-browser/ObjectPreviewExternal";

interface PageProps {
  params: Promise<{
    account_id: string;
    product_id: string;
    path?: string[];
  }>;
}

async function OpenInNewTabLink({
  account_id,
  product_id,
  object_path,
}: {
  account_id: string;
  product_id: string;
  object_path: string;
}) {
  const cloudUri = fileSourceUrl({
    account_id,
    product_id,
    object_path,
  });
  const extension = getExtension(object_path);
  const iframeSrc = await (extension
    ? getIframeSrc(cloudUri, extension)
    : null);
  if (!iframeSrc) return null;
  return (
    <Link href={iframeSrc} target="_blank" rel="noopener noreferrer" size="1">
      <Flex align="center" gap="1">
        Open in new tab
        <ExternalLinkIcon width="14" height="14" />
      </Flex>
    </Link>
  );
}

async function isFile(
  account_id: string,
  product_id: string,
  object_path: string,
): Promise<boolean> {
  // Same gates as the main slot: authorize the viewer (notFound for those
  // who may not read the product), and for a restricted/disabled product
  // with no fresh proxy credentials render nothing while the main slot
  // shows the credentials gate.
  const product = await getAuthorizedProduct(account_id, product_id);
  const creds = await readProxyCredentials();
  if (!creds && (product.visibility === "restricted" || product.disabled)) {
    return false;
  }

  try {
    const s3 = await getStorageClient(creds ?? null);
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
 * slot). Renders only when the path is a file; directories, the product
 * root, credential gating, and backend failures are the main slot's story.
 */
export default async function ObjectPreviewSlot({ params }: PageProps) {
  const { account_id, product_id, path = [] } = await params;
  const object_path = path.map((p) => decodeURIComponent(p)).join("/");
  if (!object_path || !(await isFile(account_id, product_id, object_path))) {
    return null;
  }

  return (
    <Card mt="4">
      <SectionHeader
        title="Object Preview"
        rightButton={
          <OpenInNewTabLink
            account_id={account_id}
            product_id={product_id}
            object_path={object_path}
          />
        }
      >
        <Suspense fallback={null}>
          <ObjectPreview
            account_id={account_id}
            product_id={product_id}
            object_path={object_path}
          />
        </Suspense>
      </SectionHeader>
    </Card>
  );
}
