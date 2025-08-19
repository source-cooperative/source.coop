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
  const product = await productsTable.fetchById(account_id, product_id);
  if (!product) {
    return notFound();
  }

  try {
    let selectedObject: ProductObject | undefined;
    let readmeContent = "";

    if (isFilePath) {
      try {
        selectedObject = await storage.getObjectInfo({
          account_id,
          product_id,
          object_path: pathString,
        });
      } catch {
        // Ignore if object info cannot be fetched
      }
    } else {
      // If we're at the root (no path or empty path), try to fetch and display README
      try {
        // Try to find and fetch README directly
        for (const readmePath of ["README.md"]) {
          try {
            const readmeResult = await storage.getObject({
              account_id,
              product_id,
              object_path: readmePath,
            });

            // Convert buffer to string
            if (readmeResult.data instanceof Buffer) {
              readmeContent = readmeResult.data.toString("utf-8");
              break; // Found a README, no need to check other paths
            } else {
              // Handle ReadableStream if needed
              console.warn(
                "README data is not a Buffer, skipping content display"
              );
            }
          } catch (error) {
            // File doesn't exist or can't be accessed, try next path
            continue;
          }
        }
      } catch (error) {
        console.error("Error checking for README files:", error);
        // Continue without README if there's an error
      }
    }

    return (
      <Container>
        <Box mt="4">
          <ObjectBrowser
            product={product}
            initialPath={pathString}
            selectedObject={selectedObject}
          />
        </Box>

        {/* Display README if available and we're at the root */}
        {readmeContent && !pathString && (
          <Box mt="4">
            <MarkdownViewer content={readmeContent} />
          </Box>
        )}
      </Container>
    );
  } catch (error) {
    console.error("Error loading product path:", error);
    return (
      <Text role="alert" color="red" size="3">
        {error instanceof Error
          ? error.message
          : "An error occurred while loading product contents"}
      </Text>
    );
  }
}
