import { Suspense } from "react";
import { Metadata } from "next";

import { LOGGER, dataConnectionsTable } from "@/lib";
import { getStorageClient } from "@/lib/clients/storage";
import { isAccessDeniedError } from "@/lib/storage/s3";
import { DataConnection, ProductMirror, ProductObject } from "@/types";
import { readProxyCredentials } from "@/lib/services/proxy-credentials-read";
import { getAuthorizedProduct } from "./data";
import { ProxyCredentialsGate } from "@/components/features/products/ProxyCredentialsGate";
import { ProductDataUnavailable } from "@/components/features/products/ProductDataUnavailable";
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

  // Read the user's cached proxy credentials once for this request: used both to
  // build the (signed-or-anonymous) storage client and, below, to decide whether
  // a restricted product needs the credential gate. Build one storage client and
  // reuse it for both the file-detection HEAD and the directory listing.
  const creds = await readProxyCredentials();
  // creds is already resolved here; `?? null` passes an explicit "none" so
  // getStorageClient doesn't read the cookie a second time.
  const s3 = await getStorageClient(creds ?? null);

  // For non-root paths, check if this is a file via HEAD request.
  // If the HEAD succeeds, render the file view (ObjectSummary + ObjectPreview).
  // If it fails or returns null, fall through to the directory listing.
  // Note: for a private product on first visit (no proxy-creds cookie yet),
  // `s3` is anonymous and this HEAD is denied → null, so we fall through to the
  // ProxyCredentialsGate below, which mints credentials and refreshes; the next
  // render's signed HEAD then succeeds and the file view shows. So the HEAD is
  // not expected to succeed on the initial render for a restricted product.
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

  // Directory listing — server-side via the data proxy. Read-only: we use the
  // credentials read above but never mint here (minting writes a cookie, which is
  // illegal during render). Public/unlisted data lists anonymously. For a
  // restricted product with no fresh cookie, an authenticated user is sent
  // through ProxyCredentialsGate, which mints (in an action) and refreshes the
  // page so this render then finds the credentials.
  if (!creds && product.visibility === "restricted") {
    return <ProxyCredentialsGate />;
  }

  // Strip any trailing slash from objectPath: a trailing-slash URL yields catch-all
  // segments like ["dir",""], which would otherwise build a `${product_id}/dir//`
  // prefix that S3 lists as empty even when the directory has contents.
  const s3Prefix = objectPath
    ? `${product_id}/${objectPath.replace(/\/$/, "")}/`
    : `${product_id}/`;

  // The directory listing goes through the data proxy with the user's signed
  // credentials. The viewer is already app-authorized (getAuthorizedProduct
  // above), so for a RESTRICTED product an AccessDenied here is not "you can't
  // see this" — it's the proxy refusing the signed read, usually because the
  // just-minted credentials haven't propagated yet. Surface a clear,
  // recoverable notice for that case. On a public/unlisted product the read is
  // anonymous and a 403 means the proxy is misconfigured — let it (and any
  // other error) fall through to the route error boundary (retry) rather than
  // showing the private-product copy.
  // An empty listing is a valid S3 state (e.g. a directory with no uploads yet);
  // DirectoryList renders the empty state. We intentionally do NOT fall back to
  // the parent prefix here — that masked legitimately empty directories.
  const effectivePrefix = objectPath.replace(/\/$/, "");
  let effectiveListing;
  try {
    effectiveListing = await s3.listObjects({
      bucket: account_id,
      prefix: s3Prefix,
    });
  } catch (error) {
    if (isAccessDeniedError(error) && product.visibility === "restricted") {
      LOGGER.warn("Proxy denied a signed read for an authorized viewer", {
        operation: "ProductPathPage",
        context: "directory listing",
        metadata: { account_id, product_id, objectPath },
      });
      return <ProductDataUnavailable />;
    }
    throw error;
  }

  // Strip the bucket-key product prefix so paths are relative to the product.
  const relativePath = (key: string) => {
    const prefix = `${product_id}/`;
    return key.startsWith(prefix) ? key.slice(prefix.length) : key;
  };

  const objects: ProductObject[] = [
    ...effectiveListing.objects.map((obj) => {
      const path = relativePath(obj.key);
      return {
        id: path,
        product_id,
        path,
        size: obj.size,
        type: "file" as const,
        created_at: obj.lastModified,
        updated_at: obj.lastModified,
        checksum: obj.etag,
      };
    }),
    ...effectiveListing.directories.map((dir) => {
      const path = relativePath(dir);
      const now = new Date().toISOString();
      return {
        id: path,
        product_id,
        path,
        size: 0,
        type: "directory" as const,
        created_at: now,
        updated_at: now,
        checksum: "",
        isDirectory: true,
      };
    }),
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
