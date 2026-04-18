import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";

import DirectoryListLoading from "./loading";
import { CONFIG, LOGGER, storage, dataConnectionsTable, productsTable } from "@/lib";
import { DataConnection, ProductMirror } from "@/types";
import { ProductFileBrowser } from "@/components/features/products/object-browser/ProductFileBrowser";
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

  // Directory listing — client-side via data proxy
  return (
    <Suspense fallback={<DirectoryListLoading />}>
      <ProductFileBrowser
        product={product}
        account_id={account_id}
        product_id={product_id}
        prefix={objectPath}
        endpoint={CONFIG.storage.endpoint || ""}
      />
    </Suspense>
  );
}
