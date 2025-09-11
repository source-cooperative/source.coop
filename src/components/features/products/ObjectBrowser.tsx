import { ObjectDetails } from "./object-browser/ObjectDetails";
import { DirectoryList } from "./object-browser/DirectoryList";
import "./ObjectBrowser.module.css";
import { ProductObject } from "@/types/product_object";
import { DataConnection, Product, ProductMirror } from "@/types";
import { Card, Box } from "@radix-ui/themes";
import { SectionHeader } from "@/components/core";
import { BreadcrumbNav } from "@/components/display";
import { buildDirectoryTree } from "./object-browser/utils";

export interface ObjectBrowserProps {
  product: Product;
  initialPath?: string;
  selectedObject?: ProductObject;
  connectionDetails?: {
    primaryMirror: ProductMirror;
    dataConnection: DataConnection;
  };
  objects: ProductObject[]; // Allow parent to pass objects to avoid duplicate calls
}

export async function ObjectBrowser({
  product,
  initialPath = "",
  selectedObject,
  connectionDetails,
  objects,
}: ObjectBrowserProps) {
  const currentPath = initialPath ? initialPath.split("/").filter(Boolean) : [];

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
    let cloudUri: string | undefined = undefined;
    if (connectionDetails) {
      const details = connectionDetails.dataConnection.details;
      const prefix = connectionDetails.primaryMirror.prefix;
      switch (details.provider) {
        case "s3":
          cloudUri = `s3://${details.bucket}/${prefix}${selectedObject.path}`;
          break;
        case "az":
          cloudUri = `https://${details.account_name}.blob.core.windows.net/${details.container_name}/${prefix}${selectedObject.path}`;
          break;
        default:
          break;
      }
    }
    const sourceUrl = `https://data.source.coop/${product.account?.account_id}/${product.product_id}/${selectedObject.path}`;
    return (
      <>
        <ObjectDetails
          product={product}
          selectedObject={selectedObject}
          selectedDataItem={null}
          cloudUri={cloudUri}
        />

        {cloudUri?.endsWith(".pmtiles") ? (
          <Card style={{ marginTop: "2rem" }}>
            <SectionHeader title="Preview" />
            <iframe
              frameBorder="0"
              width="100%"
              height="600px"
              src={`https://pmtiles.io/#url=${sourceUrl}&iframe=true`}
            >
              Your browser does not support iframes.
            </iframe>
          </Card>
        ) : cloudUri?.endsWith(".parquet") ? (
          <Card style={{ marginTop: "2rem" }}>
            <SectionHeader title="Preview" />
            <iframe
              frameBorder="0"
              width="100%"
              height="600px"
              src={`https://hyparam.github.io/demos/hyparquet/?key=${sourceUrl}`}
            >
              Your browser does not support iframes.
            </iframe>
          </Card>
        ) : null}
      </>
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
