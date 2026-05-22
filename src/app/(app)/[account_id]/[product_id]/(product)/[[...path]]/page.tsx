import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";

import { CONFIG, LOGGER, storage, dataConnectionsTable, productsTable } from "@/lib";
import { DataConnection, ProductMirror, ProductObject } from "@/types";
import { S3ReadClient } from "@/lib/services/s3-read";
import { ensureProxyCredentials } from "@/lib/services/proxy-credentials-cache";
import { getPageSession } from "@/lib/api/utils";
import { DirectoryList } from "@/components/features/products/object-browser/DirectoryList";
import { ObjectSummary } from "@/components/features/products/object-browser/ObjectSummary";
import {
  ObjectPreview,
  ObjectPreviewLoading,
} from "@/components/features/products/object-browser/ObjectPreview";
import { generateProductMetadata } from "@/components/features/metadata/ProductMetadata";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { account_id, product_id } = await params;
  const product = await productsTable.fetchById(account_id, product_id);
  if (!product) {
    notFound();
  }
  return generateProductMetadata({ product });
}

interface PageProps {
  params: Promise<{
    account_id: string;
    product_id: string;
    path?: string[];
  }>;
}

export default async function ProductPathPage({ params }: PageProps) {
  let { account_id, product_id, path } = await params;
  path = path?.map((p) => decodeURIComponent(p)) || [];
  const objectPath = path.join("/");

  const product = await productsTable.fetchById(account_id, product_id);
  if (!product) {
    notFound();
  }

  // For non-root paths, check if this is a file via HEAD request.
  // If the HEAD succeeds, render the file view (ObjectSummary + ObjectPreview).
  // If it fails or returns null, fall through to the directory listing.
  if (objectPath) {
    const objectInfo = await storage
      .getObjectInfo({ account_id, product_id, object_path: objectPath })
      .catch((error) => {
        LOGGER.debug("HEAD request failed, treating as directory", {
          operation: "ProductPathPage",
          context: "object info lookup",
          metadata: { account_id, product_id, objectPath, error: String(error) },
        });
        return null;
      });

    if (objectInfo?.type === "file") {
      let connectionDetails:
        | { primaryMirror: ProductMirror; dataConnection: DataConnection }
        | undefined;

      const primaryMirror =
        product.metadata.mirrors[product.metadata.primary_mirror];
      const dataConnection = await dataConnectionsTable.fetchById(
        primaryMirror.connection_id,
      );
      if (dataConnection) {
        connectionDetails = { primaryMirror, dataConnection };
      }

      return (
        <>
          <ObjectSummary
            product={product}
            objectInfo={objectInfo}
            connectionDetails={connectionDetails}
          />
          <Suspense fallback={<ObjectPreviewLoading />}>
            <ObjectPreview
              account_id={account_id}
              product_id={product_id}
              object_path={objectPath}
            />
          </Suspense>
        </>
      );
    }
  }

  // Directory listing — server-side via the data proxy, using the user's
  // cached proxy credentials when authenticated.
  const session = await getPageSession();
  const creds = session?.identity_id
    ? await ensureProxyCredentials(session.identity_id).catch((error) => {
        LOGGER.error("Failed to obtain proxy credentials", {
          operation: "ProductPathPage",
          context: "proxy credentials",
          error,
          metadata: { identity_id: session.identity_id },
        });
        return undefined;
      })
    : undefined;

  const s3 = new S3ReadClient({
    endpoint: CONFIG.storage.endpoint || "",
    credentials: creds,
  });

  const s3Prefix = objectPath
    ? `${product_id}/${objectPath}/`
    : `${product_id}/`;
  const listing = await s3.listObjects({ bucket: account_id, prefix: s3Prefix });

  // If the listing is empty and we have a prefix, this is likely a file path
  // whose HEAD failed earlier (e.g. transient error). Fall back to listing
  // the parent directory so the user lands on something useful.
  let effectivePrefix = objectPath;
  let effectiveListing = listing;
  if (
    effectiveListing.objects.length === 0 &&
    effectiveListing.directories.length === 0 &&
    effectivePrefix
  ) {
    const parent = effectivePrefix.includes("/")
      ? effectivePrefix.substring(0, effectivePrefix.lastIndexOf("/"))
      : "";
    const parentS3Prefix = parent ? `${product_id}/${parent}/` : `${product_id}/`;
    effectiveListing = await s3.listObjects({
      bucket: account_id,
      prefix: parentS3Prefix,
    });
    effectivePrefix = parent;
  }

  const objects: ProductObject[] = [
    ...effectiveListing.objects.map((obj) => ({
      id: obj.key,
      product_id,
      path: obj.key.replace(`${product_id}/`, ""),
      size: obj.size,
      type: "file" as const,
      created_at: obj.lastModified,
      updated_at: obj.lastModified,
      checksum: obj.etag,
    })),
    ...effectiveListing.directories.map((dir) => ({
      id: dir,
      product_id,
      path: dir.replace(`${product_id}/`, ""),
      size: 0,
      type: "directory" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      checksum: "",
      isDirectory: true,
    })),
  ];

  return (
    <DirectoryList
      product={product}
      objects={objects.filter(
        (obj) => obj.path.replace(/\/$/, "") !== effectivePrefix,
      )}
      prefix={effectivePrefix}
    />
  );
}
