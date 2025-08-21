import { Container, Box } from "@radix-ui/themes";
import { notFound } from "next/navigation";

import { ObjectBrowser } from "@/components/features/products";
import { MarkdownViewer } from "@/components/features/markdown";

import { dataConnectionsTable, productsTable } from "@/lib/clients/database";
import { storage } from "@/lib/clients/storage";
import { DataConnection, ProductMirror } from "@/types";

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
  // 1. Get and await params
  const { account_id, product_id, path } = await params;
  const object_path = decodeURIComponent(path?.join("/") || "");

  // 2. Run concurrent requests for better performance
  const [product, objectInfo, readmeContent, objectsList] =
    await Promise.allSettled([
      // Always fetch product info
      productsTable.fetchById(account_id, product_id),

      // If looking at a path, fetch object info for the current path
      object_path
        ? storage.getObjectInfo({
            account_id,
            product_id,
            object_path,
          })
        : undefined,

      // If not looking at a path, try to fetch README
      !object_path
        ? storage
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
            .then((result) => {
              if (result.data instanceof Buffer) {
                return result.data.toString("utf-8");
              }
              return undefined;
            })
            .catch(() => undefined) // If README doesn't exist, that's fine
        : undefined,

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
        .then((result) => result.objects || [])
        .catch(() => []),
    ]);

  // Handle product fetch failure
  if (product.status === "rejected" || !product.value) {
    return notFound();
  }

  // Extract values from settled promises
  const selectedObject =
    objectInfo.status === "fulfilled" ? objectInfo.value : undefined;

  const readme =
    readmeContent.status === "fulfilled" ? readmeContent.value : "";

  const objects = objectsList.status === "fulfilled" ? objectsList.value : [];

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
      console.error(
        `Data connection not found for ${primaryMirror.connection_id}`,
        { primaryMirror }
      );
    } else {
      connectionDetails = {
        primaryMirror,
        dataConnection,
      };
    }
  }

  return (
    <Container>
      <Box mt="4">
        <ObjectBrowser
          product={product.value}
          initialPath={object_path}
          selectedObject={selectedObject || undefined}
          objects={objects}
          connectionDetails={connectionDetails}
        />
      </Box>

      {/* Display README if available and we're at the root */}
      {readme && (
        <Box mt="4">
          <MarkdownViewer content={readme} />
        </Box>
      )}
    </Container>
  );
}
