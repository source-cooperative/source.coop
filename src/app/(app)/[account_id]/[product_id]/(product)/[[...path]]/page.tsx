import { Suspense } from "react";
import { Metadata } from "next";

import { LOGGER, dataConnectionsTable, getPageSession } from "@/lib";
import { getStorageClient } from "@/lib/clients/storage";
import { isAccessDeniedError } from "@/lib/storage/s3";
import { isAuthorized } from "@/lib/api/authz";
import { Actions, DataConnection, ProductMirror, ProductObject } from "@/types";
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
import { UsageCard } from "@/components/features/analytics";
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

// Shown when a read through the data proxy fails for a non-authz reason (the
// backend hung / 5xx'd / returned an unparseable body). Recoverable, so the
// ProductDataUnavailable "Try again" button refreshes.
const DATA_UNAVAILABLE_MESSAGE =
  "This product's files couldn't be loaded just now — the storage backend didn't respond. Try again in a moment.";

export default async function ProductPathPage({ params }: PageProps) {
  let { account_id, product_id, path } = await params;
  path = path?.map((p) => decodeURIComponent(p)) || [];
  const objectPath = path.join("/");

  // Fetch + authorize. Throws a 404 for missing products or unauthorized
  // viewers, so the S3 reads below never run for someone who may not read this
  // product.
  const product = await getAuthorizedProduct(account_id, product_id);

  // A deactivated (disabled) product is reachable here only by its
  // owners/maintainers and admins — backend authz 404s everyone else — and the
  // data proxy won't serve its objects to an anonymous reader. So read its data
  // with signed credentials regardless of visibility, taking the same
  // gate-and-mint path a restricted product takes.
  const needsAuthenticatedRead =
    product.visibility === "restricted" || product.disabled;

  // Maintainers (anyone who can edit the product — same gate as the Edit button,
  // Actions.PutRepository) get the raw failure surfaced in ProductDataUnavailable
  // so they can debug a broken data connection. Everyone else only sees the
  // generic notice. The gate is here, server-side, so error internals never reach
  // a non-maintainer's browser.
  const session = await getPageSession();
  const canEditProduct = isAuthorized(session, product, Actions.PutRepository);
  const errorDetailsFor = (error: unknown) =>
    canEditProduct ? String(error) : undefined;

  // Read the user's cached proxy credentials once for this request: used both to
  // build the (signed-or-anonymous) storage client and, below, to decide whether
  // the product needs the credential gate. Build one storage client and
  // reuse it for both the file-detection HEAD and the directory listing.
  const creds = await readProxyCredentials();
  // creds is already resolved here; `?? null` passes an explicit "none" so
  // getStorageClient doesn't read the cookie a second time.
  const s3 = await getStorageClient(creds ?? null);

  // For non-root paths, check if this is a file via HEAD request.
  // If the HEAD succeeds, render the file view (ObjectSummary + ObjectPreview).
  // getObjectInfo returns null on NotFound (not a file → directory listing).
  // AccessDenied also falls through: for a private product on first visit (no
  // proxy-creds cookie yet), `s3` is anonymous and this HEAD is denied, and the
  // ProxyCredentialsGate below mints credentials and refreshes; the next
  // render's signed HEAD then succeeds and the file view shows. So the HEAD is
  // not expected to succeed on the initial render for a restricted product.
  // Anything else (a proxy hang / 5xx / unparseable response) means the backend
  // is unreachable, not an authz problem — degrade in place (ProductDataUnavailable)
  // so the product header and Edit link stay visible, instead of throwing to the
  // route error boundary, which would blank the whole product.
  if (objectPath) {
    let objectInfo: ProductObject | null;
    try {
      objectInfo = await s3.getObjectInfo({
        account_id,
        product_id,
        object_path: objectPath,
      });
    } catch (error) {
      if (!isAccessDeniedError(error)) {
        LOGGER.warn("Storage backend unavailable for object HEAD", {
          operation: "ProductPathPage",
          context: "object info lookup",
          metadata: { account_id, product_id, objectPath, error: String(error) },
        });
        return (
          <ProductDataUnavailable
            message={DATA_UNAVAILABLE_MESSAGE}
            details={errorDetailsFor(error)}
          />
        );
      }
      LOGGER.debug("HEAD request denied, treating as directory", {
        operation: "ProductPathPage",
        context: "object info lookup",
        metadata: { account_id, product_id, objectPath, error: String(error) },
      });
      objectInfo = null;
    }

    if (objectInfo?.type === "file") {
      let connectionDetails:
        | { primaryMirror: ProductMirror; dataConnection: DataConnection }
        | undefined;

      // primary_mirror may be empty or stale (e.g. its mirror/connection was
      // removed), so guard before dereferencing.
      const primaryMirror =
        product.metadata.mirrors[product.metadata.primary_mirror];
      const dataConnection = primaryMirror
        ? await dataConnectionsTable.fetchById(primaryMirror.connection_id)
        : null;
      if (primaryMirror && dataConnection) {
        connectionDetails = { primaryMirror, dataConnection };
      }

      return (
        <>
          <ObjectSummary
            product={product}
            objectInfo={objectInfo}
            connectionDetails={connectionDetails}
          />
          {/* Recent download stats for this object; hidden when analytics is off */}
          <Suspense fallback={null}>
            <UsageCard
              accountId={account_id}
              productId={product_id}
              objectPath={objectPath}
              variant="section"
            />
          </Suspense>
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
  if (!creds && needsAuthenticatedRead) {
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
  // above), so any failure here is a proxy/backend problem, not "you can't see
  // this" — and we never want it to blank the whole product (the header + Edit
  // link must stay reachable so an owner can fix a broken connection). So we
  // degrade in place for every error:
  //  - RESTRICTED + AccessDenied: the signed read was refused, usually because
  //    just-minted credentials haven't propagated yet — the private-data copy.
  //  - anything else (proxy hung / 5xx / unparseable response, or a misconfigured
  //    public connection): a generic "couldn't load the contents" notice.
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
    if (isAccessDeniedError(error) && needsAuthenticatedRead) {
      LOGGER.warn("Proxy denied a signed read for an authorized viewer", {
        operation: "ProductPathPage",
        context: "directory listing",
        metadata: { account_id, product_id, objectPath },
      });
      return <ProductDataUnavailable details={errorDetailsFor(error)} />;
    }
    LOGGER.warn("Storage backend unavailable for directory listing", {
      operation: "ProductPathPage",
      context: "directory listing",
      metadata: { account_id, product_id, objectPath, error: String(error) },
    });
    return (
      <ProductDataUnavailable
        message={DATA_UNAVAILABLE_MESSAGE}
        details={errorDetailsFor(error)}
      />
    );
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
