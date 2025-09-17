import { Container, Box, Callout, Link } from "@radix-ui/themes";
import { notFound } from "next/navigation";

import { ObjectBrowser } from "@/components/features/products";
import { MarkdownViewer } from "@/components/features/markdown";

import { dataConnectionsTable, productsTable } from "@/lib/clients/database";
import { storage } from "@/lib/clients/storage";
import { DataConnection, ProductMirror } from "@/types";
import { LOGGER } from "@/lib";
import { MonoText } from "@/components/core";
import { InfoCircledIcon } from "@radix-ui/react-icons";

function StorageErrorDisplay({ error }: { error: Error }) {
  const getErrorMessage = (error: Error) => {
    if (!error) return "Unknown error";

    // Handle AWS SDK errors
    if (error.name === "NoSuchBucket") {
      return "The storage bucket does not exist.";
    }
    if (error.name === "AccessDenied") {
      return "Access denied to the storage bucket.";
    }
    if (error.name === "InvalidBucketName") {
      return "Invalid bucket name.";
    }
    if (error.name === "NetworkingError") {
      return "Network error connecting to storage.";
    }

    // For deserialization errors, try to extract more info
    if (error.message?.includes("Deserialization error")) {
      return "Storage service returned an unexpected response format.";
    }

    // Fallback to the error message if it's reasonable
    if (
      error.message &&
      !error.message.includes("#text") &&
      !error.message.includes("Deserialization error")
    ) {
      return `Error: ${error.message}`;
    }

    return "Storage service is currently unavailable.";
  };

  return (
    <Box>
      <MonoText color="red">
        Unable to load directory contents. This may be due to:
        <br />
        • The bucket or product not existing
        <br />
        • Network connectivity issues
        <br />
        • Insufficient permissions
        <br />
        <br />
        {getErrorMessage(error)}
      </MonoText>
    </Box>
  );
}

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
  searchParams: Promise<{
    success?: string;
  }>;
}

export default async function ProductPathPage({
  params,
  searchParams,
}: PageProps) {
  // 1. Get and await params
  const { account_id, product_id, path } = await params;
  const search = await searchParams;
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
        .then((result) => result.objects || []),
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

  return (
    <Container>
      {!!Object.hasOwn(search, "success") && (
        <Callout.Root color="blue">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            Your product has been created. Contact{" "}
            <Link href="mailto:hello@source.coop">hello@source.coop</Link> for
            more information about accessing the bucket.
          </Callout.Text>
        </Callout.Root>
      )}
      <Box mt="4">
        {objectsList.status === "fulfilled" ? (
          <ObjectBrowser
            product={product.value}
            initialPath={object_path}
            selectedObject={selectedObject || undefined}
            objects={objectsList.value}
            connectionDetails={connectionDetails}
          />
        ) : (
          <StorageErrorDisplay error={objectsList.reason} />
        )}
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
