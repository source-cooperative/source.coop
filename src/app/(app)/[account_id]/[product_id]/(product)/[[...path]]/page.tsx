import { Suspense } from "react";
import { Metadata } from "next";

import { LOGGER, getStorageClient, dataConnectionsTable, getPageSession } from "@/lib";
import { DataConnection, ProductMirror, ProductObject } from "@/types";
import { readProxyCredentials } from "@/lib/services/proxy-credentials-read";
import { getAuthorizedProduct } from "./data";
import { ProxyCredentialsGate } from "@/components/features/products/ProxyCredentialsGate";
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
  // Authorize before exposing any metadata — generateMetadata runs independently
  // of the layout, so without this an unauthorized viewer could read a
  // restricted product's title/description via HTTP headers and OG tags.
  const product = await getAuthorizedProduct(account_id, product_id);
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

  // Fetch + authorize. Throws a 404 for missing products or unauthorized
  // viewers, so the S3 reads below never run for someone who may not read this
  // product.
  const product = await getAuthorizedProduct(account_id, product_id);

  // Build one storage client per request (signed when the user has proxy
  // credentials cached, anonymous otherwise) and reuse it for both the
  // file-detection HEAD and the directory listing below.
  const s3 = await getStorageClient();

  // For non-root paths, check if this is a file via HEAD request.
  // If the HEAD succeeds, render the file view (ObjectSummary + ObjectPreview).
  // If it fails or returns null, fall through to the directory listing.
  if (objectPath) {
    const objectInfo = await s3
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

  // Directory listing — server-side via the data proxy. Read-only: we read the
  // user's cached proxy credentials from the cookie but never mint here (minting
  // writes a cookie, which is illegal during render). Public/unlisted data lists
  // anonymously. For a restricted product with no fresh cookie, an authenticated
  // user is sent through ProxyCredentialsGate, which mints (in an action) and
  // refreshes the page so this render then finds the credentials.
  const creds = await readProxyCredentials();
  if (!creds && product.visibility === "restricted") {
    // Authorization above guarantees this viewer is a member, so they have a
    // session — send them through the gate to mint credentials (in an action)
    // and re-render. The session check stays as a defensive guard.
    const session = await getPageSession();
    if (session?.identity_id) {
      return <ProxyCredentialsGate />;
    }
  }

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
