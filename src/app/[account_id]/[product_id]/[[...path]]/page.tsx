/**
 * Product Path Page - Displays product contents at a specific path
 *
 * KEEP IT SIMPLE:
 * 1. URL params are known values (/[account_id]/[product_id]/[...path])
 * 2. Get data -> Transform if needed -> Render
 * 3. Trust your types, avoid complex validation
 * 4. Let Next.js handle errors (404, 500, etc.)
 * 5. No helper functions unless truly needed
 */

// External packages
import { Text, Container, Box } from "@radix-ui/themes";
import { notFound } from "next/navigation";

// Internal components
import { ObjectBrowser } from "@/components/features/products";
import { MarkdownViewer } from "@/components/features/markdown";

// Utilities
import { productsTable } from "@/lib/clients/database";
import { storage } from "@/lib/clients/storage";
import type { ProductObject } from "@/types/product_object";

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
  const pathString = decodeURIComponent(path?.join("/") || "");

  // Check if this is a file path (ends with a file extension)
  const isFilePath = pathString && /\.\w+$/.test(pathString);

  // 2. Run concurrent requests for better performance
  const [product, objectInfo, readmeContent, objectsList] =
    await Promise.allSettled([
      // Always fetch product info
      productsTable.fetchById(account_id, product_id),

      // If file path, fetch object info
      isFilePath
        ? storage.getObjectInfo({
            account_id,
            product_id,
            object_path: pathString,
          })
        : Promise.resolve(undefined),

      // If directory, try to fetch README
      !isFilePath
        ? storage
            .getObject({
              account_id,
              product_id,
              object_path: "README.md",
            })
            .then((result) => {
              if (result.data instanceof Buffer) {
                return result.data.toString("utf-8");
              }
              return "";
            })
            .catch(() => "") // Ignore README fetch errors
        : Promise.resolve(""),

      // Always fetch objects list for directory browsing
      storage
        .listObjects({
          account_id,
          product_id,
          object_path: pathString,
          prefix:
            pathString && !pathString.endsWith("/")
              ? `${pathString}/`
              : pathString,
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
  const selectedObject: ProductObject | undefined =
    objectInfo.status === "fulfilled" ? objectInfo.value : undefined;

  const readme =
    readmeContent.status === "fulfilled" ? readmeContent.value : "";

  const objects = objectsList.status === "fulfilled" ? objectsList.value : [];

  return (
    <Container>
      <Box mt="4">
        <ObjectBrowser
          product={product.value}
          initialPath={pathString}
          selectedObject={selectedObject}
          objects={objects}
        />
      </Box>

      {/* Display README if available and we're at the root */}
      {readme && !pathString && (
        <Box mt="4">
          <MarkdownViewer content={readme} />
        </Box>
      )}
    </Container>
  );
}
