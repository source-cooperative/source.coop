import { Suspense } from "react";
import { notFound } from "next/navigation";

import DirectoryListLoading from "./loading";
import {
  LOGGER,
  storage,
  dataConnectionsTable,
  productsTable,
  CONFIG,
  fileSourceUrl,
} from "@/lib";
import { DataConnection, ProductMirror } from "@/types";
import { DirectoryList, ObjectSummary, ObjectPreview } from "@/components";

export async function generateMetadata({ params }: PageProps) {
  const { account_id, product_id, path } = await params;
  const product = await productsTable.fetchById(account_id, product_id);
  let title = product?.title || "Untitled Product";
  if (path) {
    title = `${path.join("/")} | ${title}`;
  }
  const description = product?.description || "A product on Source.coop";
  return { title, description };
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
  const { product, objectsList, objectInfo, connectionDetails } =
    await fetchProduct(account_id, product_id, objectPath);

  if (objectInfo?.type === "file") {
    return (
      <Suspense fallback={<DirectoryListLoading />}>
        <ObjectSummary
          product={product}
          objectInfo={objectInfo}
          connectionDetails={connectionDetails}
        />
        <ObjectPreview sourceUrl={fileSourceUrl(product, objectInfo)} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<DirectoryListLoading />}>
      <DirectoryList
        product={product}
        objects={objectsList.filter(
          // Exclude the current directory object
          (obj) => obj.path.replace(/\/$/, "") !== objectPath
        )}
        prefix={objectPath}
      />
    </Suspense>
  );
}

export async function fetchProduct(
  account_id: string,
  product_id: string,
  object_path: string
) {
  // 1. Get and await params
  const isRoot = !object_path;

  // 2. Run concurrent requests for better performance
  const [product, objectsList, objectInfo] = await Promise.allSettled([
    // Always fetch product info
    productsTable.fetchById(account_id, product_id),

    // Always fetch objects list for directory browsing
    storage
      .listObjects({
        account_id,
        product_id,
        object_path,
        prefix:
          object_path && !object_path?.endsWith("/")
            ? `${object_path}/`
            : object_path,
        delimiter: "/",
      })
      .then((result) => result.objects || []),

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
      primaryMirror.connection_id
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
    objectsList: objectsList.status === "fulfilled" ? objectsList.value : [],
    objectInfo: selectedObject || undefined,
    connectionDetails,
  };
}
