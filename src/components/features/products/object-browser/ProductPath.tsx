import { Box } from "@radix-ui/themes";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { ObjectBrowser } from "@/components/features/products";
import { MarkdownViewer } from "@/components/features/markdown";

import { dataConnectionsTable, productsTable } from "@/lib/clients/database";
import { storage } from "@/lib/clients/storage";
import { DataConnection, ProductMirror } from "@/types";
import { LOGGER } from "@/lib";

interface ProductPathComponentProps {
  account_id: string;
  product_id: string;
  objectPath: string;
}

async function fetchProduct(
  account_id: string,
  product_id: string,
  object_path: string
) {
  // 1. Get and await params
  const isRoot = !object_path;

  // 2. Run concurrent requests for better performance
  const [product, objectsList, objectInfo, readmeContent] =
    await Promise.allSettled([
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

      // If looking at the root, try to fetch README
      isRoot &&
        storage
          .headObject({
            account_id,
            product_id,
            object_path: "README.md",
          })
          .then(() =>
            storage.getObject({
              account_id,
              product_id,
              object_path: "README.md",
            })
          )
          .then((result) =>
            result.data instanceof Buffer
              ? result.data.toString("utf-8")
              : undefined
          )
          .catch(() => undefined), // If README doesn't exist, that's fine
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
    readme: readmeContent.status === "fulfilled" ? readmeContent.value : "",
    connectionDetails,
  };
}

export async function ProductPathComponent({
  account_id,
  product_id,
  objectPath,
}: ProductPathComponentProps) {
  const { product, objectsList, objectInfo, readme, connectionDetails } =
    await fetchProduct(account_id, product_id, objectPath);

  return (
    <Suspense>
      <ObjectBrowser
        product={product}
        initialPath={objectPath}
        selectedObject={objectInfo}
        objects={objectsList}
        connectionDetails={connectionDetails}
      />

      {/* Display README if available */}
      {readme && (
        <Box mt="4">
          <MarkdownViewer content={readme} />
        </Box>
      )}
    </Suspense>
  );
}
