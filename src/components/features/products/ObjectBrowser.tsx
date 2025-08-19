import { ObjectDetails } from "./object-browser/ObjectDetails";
import { DirectoryList } from "./object-browser/DirectoryList";
import "./ObjectBrowser.module.css";
import { ProductObject } from "@/types/product_object";
import { Product } from "@/types";
import { Card, Box } from "@radix-ui/themes";
import { SectionHeader } from "@/components/core";
import { BreadcrumbNav } from "@/components/display";
import { createStorageClient } from "@/lib/clients/storage";
import { buildDirectoryTree } from "./object-browser/utils";

export interface ObjectBrowserProps {
  product: Product;
  initialPath?: string;
  selectedObject?: ProductObject;
}

export async function ObjectBrowser({
  product,
  initialPath = "",
  selectedObject,
}: ObjectBrowserProps) {
  const currentPath = initialPath ? initialPath.split("/").filter(Boolean) : [];
  const pathString = currentPath.join("/");

  // Fetch objects server-side
  let objects: ProductObject[] = [];
  try {
    const prefix =
      pathString && !pathString.endsWith("/") ? `${pathString}/` : pathString;
    const result = await createStorageClient().listObjects({
      account_id: product.account_id,
      product_id: product.product_id,
      object_path: pathString,
      prefix,
      delimiter: "/",
    });
    objects = result.objects || [];
  } catch (error) {
    console.error("Error fetching objects:", error);
    objects = [];
  }

  // Build directory tree
  const root = buildDirectoryTree(objects, currentPath);
  const items = Object.values(root).sort((a, b) => {
    // Directories first, then alphabetically
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  // If we have a selected object and it's a file, show file details
  if (selectedObject && selectedObject.type !== "directory") {
    return (
      <ObjectDetails
        product={product}
        selectedObject={selectedObject}
        selectedDataItem={null}
      />
    );
  }

  // For directory view, show the contents of the current directory
  return (
    <Card>
      <SectionHeader title="Product Contents">
        <Box
          style={{
            borderBottom: "1px solid var(--gray-5)",
            paddingBottom: "var(--space-3)",
            marginBottom: "var(--space-3)",
          }}
        >
          <BreadcrumbNav
            path={currentPath}
            baseUrl={`/${product.account_id}/${product.product_id}`}
          />
        </Box>
      </SectionHeader>

      <DirectoryList
        items={items}
        currentPath={currentPath}
        product={product}
      />
    </Card>
  );
}
