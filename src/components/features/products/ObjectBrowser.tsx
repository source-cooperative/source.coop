"use client";

import { ShortcutHelp } from "@/components/features/keyboard/ShortcutHelp";
import { useObjectBrowserKeyboardShortcuts } from "@/hooks/useObjectBrowserKeyboardShortcuts";
import { ObjectDetails } from "./object-browser/ObjectDetails";
import { DirectoryList } from "./object-browser/DirectoryList";
import "./ObjectBrowser.module.css";
import { ProductObject } from "@/types/product_object";
import { Product } from "@/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export function ObjectBrowser({
  product,
  initialPath = "",
  selectedObject,
}: ObjectBrowserProps) {
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState<string[]>(
    initialPath ? initialPath.split("/").filter(Boolean) : []
  );
  const [showHelp, setShowHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [objectsByPath, setObjectsByPath] = useState<
    Record<string, ProductObject[]>
  >({});

  const pathString = useMemo(() => currentPath.join("/"), [currentPath]);

  const fetchObjects = useCallback(
    async (path: string) => {
      try {
        setIsLoading(true);
        const prefix = path && !path.endsWith("/") ? `${path}/` : path;
        const result = await createStorageClient().listObjects({
          account_id: product.account_id,
          product_id: product.product_id,
          object_path: path,
          prefix,
          delimiter: "/",
        });
        setObjectsByPath((prev) => ({ ...prev, [path]: result.objects || [] }));
      } catch (error) {
        console.error("Error fetching objects:", error);
        setObjectsByPath((prev) => ({ ...prev, [path]: [] }));
      } finally {
        setIsLoading(false);
      }
    },
    [product]
  );

  useEffect(() => {
    if (!objectsByPath[pathString]) {
      fetchObjects(pathString);
    }
  }, [fetchObjects, objectsByPath, pathString]);

  const items = useMemo(() => {
    const objects = objectsByPath[pathString] || [];
    const root = buildDirectoryTree(objects, currentPath);
    return Object.values(root).sort((a, b) => {
      // Directories first, then alphabetically
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }, [objectsByPath, pathString]);

  const { focusedIndex, setFocusedIndex, selectedDataItem } =
    useObjectBrowserKeyboardShortcuts({
      product,
      objects: items,
      currentPath,
      selectedObject,
      onShowHelp: () => setShowHelp(true),
      onNavigateToPath: (newPath: string[]) => {
        setCurrentPath(newPath);
      },
      onNavigateToFile: (path: string) => {
        router.push(`/${product.account_id}/${product.product_id}/${path}`);
      },
    });

  // If we have a selected object and it's a file, show file details
  // Only show file details if the file exists in our objects list
  if (selectedObject && selectedObject.type !== "directory") {
    return (
      <>
        <ObjectDetails
          product={product}
          selectedObject={selectedObject}
          selectedDataItem={selectedDataItem}
        />
        <ShortcutHelp
          open={showHelp}
          onOpenChange={setShowHelp}
          context="object-details"
        />
      </>
    );
  }

  // For directory view, show the contents of the current directory
  return (
    <>
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
          focusedIndex={focusedIndex}
          itemRefs={itemRefs}
          product={product}
          setFocusedIndex={setFocusedIndex}
          isLoading={isLoading}
        />
      </Card>
      <ShortcutHelp
        open={showHelp}
        onOpenChange={setShowHelp}
        context="object-browser"
      />
    </>
  );
}
