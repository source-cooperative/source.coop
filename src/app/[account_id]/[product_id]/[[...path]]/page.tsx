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
            .catch(() => "") // If README doesn't exist, that's fine
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

  return (
    <Container>
      <Box mt="4">
        <ObjectBrowser
          product={product.value}
          initialPath={object_path}
          selectedObject={selectedObject || undefined}
          objects={objects}
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
