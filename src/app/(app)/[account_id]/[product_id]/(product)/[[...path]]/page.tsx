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
  const { product, objectInfo, connectionDetails } =
    await fetchProduct(account_id, product_id, objectPath);

  return (
    <Suspense fallback={<DirectoryListLoading />}>
      {objectInfo?.type === "file" ? (
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
      ) : (
        <ProductFileBrowser
          product={product}
          account_id={account_id}
          product_id={product_id}
          prefix={objectPath}
          endpoint={CONFIG.storage.endpoint || ""}
        />
      )}
    </Suspense>
  );
}

export async function fetchProduct(
  account_id: string,
  product_id: string,
  object_path: string,
) {
  // 1. Get and await params
  const isRoot = !object_path;

  // 2. Run concurrent requests for better performance
  const [product, objectInfo] = await Promise.allSettled([
    // Always fetch product info
    productsTable.fetchById(account_id, product_id),

    // If looking at a path, fetch object info for the current path
    !isRoot &&
      storage.getObjectInfo({
        account_id,
        product_id,
        object_path,
      }),
  ]);

  // Handle product fetch failure
  if (product.status === "rejected" || !product.value) {
    notFound();
  }

  // Extract values from settled promises
  const selectedObject =
    objectInfo.status === "fulfilled" ? objectInfo.value : undefined;

  let connectionDetails:
    | {
        primaryMirror: ProductMirror;
        dataConnection: DataConnection;
      }
    | undefined = undefined;

  if (selectedObject) {
    const primaryMirror =
      product.value.metadata.mirrors[product.value.metadata.primary_mirror];
    const dataConnection = await dataConnectionsTable.fetchById(
      primaryMirror.connection_id,
    );
    if (!dataConnection) {
      LOGGER.error("Data connection not found", {
        operation: "ProductPathPage",
        context: "data connection lookup",
        metadata: {
          connection_id: primaryMirror.connection_id,
          primaryMirror,
        },
      });
    } else {
      connectionDetails = {
        primaryMirror,
        dataConnection,
      };
    }
  }
  return {
    product: product.value,
    objectInfo: selectedObject || undefined,
    connectionDetails,
  };
}
