"use client";

import { Box, Text } from "@radix-ui/themes";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { useRef, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MonoText } from "@/components/core";
import { asFileNodes, mergeUploadsWithFiles } from "./utils";
import type { Product, ProductObject } from "@/types";
import styles from "./ObjectBrowser.module.css";
import { DirectoryRow } from "./DirectoryRow";
import { useUploadManager } from "@/components/features/uploader";

interface DirectoryListProps {
  product: Product;
  objects: ProductObject[]; // Allow parent to pass objects to avoid duplicate calls
  prefix: string;
  focusedIndex?: number;
  setFocusedIndex?: (index: number) => void;
}

const MAX_VISIBLE_ITEMS = 20;
const ITEM_HEIGHT = 40;
const UPLOADING_ITEM_HEIGHT = ITEM_HEIGHT * 1.5; // Extra height for progress bar and status

export function DirectoryList({
  objects,
  prefix,
  product,
  focusedIndex = 0,
  setFocusedIndex,
}: DirectoryListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const { getUploadsForScope } = useUploadManager();

  // Get uploads for this specific product scope
  const scope = {
    accountId: product.account_id,
    productId: product.product_id,
  };
  const scopedUploads = getUploadsForScope(scope);

  // Merge file objects with upload progress
  const items = mergeUploadsWithFiles(
    asFileNodes(objects),
    scopedUploads,
    prefix
  );

  // Sort items: directories first, then files alphabetically
  items.sort((a, b) => {
    // Directories first
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    // Then alphabetically
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  // Helper to get item height based on upload status
  const getItemHeight = (index: number) => {
    const item = items[index];
    const isUploading =
      item?.uploadProgress && item.uploadProgress.status !== "completed";
    return isUploading ? UPLOADING_ITEM_HEIGHT : ITEM_HEIGHT;
  };

  // Check if we need to show scroll indicator
  useEffect(() => {
    if (items.length > MAX_VISIBLE_ITEMS) {
      setShowScrollIndicator(true);

      // Hide the indicator after 5 seconds
      const timer = setTimeout(() => {
        setShowScrollIndicator(false);
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setShowScrollIndicator(false);
    }
  }, [items.length]);

  const rowProps = {
    itemsLength: items.length,
    product,
    focusedIndex,
    setFocusedIndex,
    itemRefs,
  };
  const isVirtualized = items.length > MAX_VISIBLE_ITEMS;

  // Set up virtualizer with dynamic heights
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => getItemHeight(index),
    overscan: 3,
    scrollPaddingStart: ITEM_HEIGHT / 2,
    scrollPaddingEnd: ITEM_HEIGHT / 2,
    enabled: true,
  });

  return (
    <Box
      ref={parentRef}
      style={
        isVirtualized
          ? {
              maxHeight: `${Math.min(
                items.length * ITEM_HEIGHT,
                MAX_VISIBLE_ITEMS * ITEM_HEIGHT
              )}px`,
              overflow: "auto",
              willChange: "transform",
              position: "relative",
            }
          : { position: "relative" }
      }
    >
      {items.length === 0 && (
        <Box p="4">
          <MonoText color="gray">This directory is empty.</MonoText>
        </Box>
      )}

      {showScrollIndicator && (
        <Box
          className={styles.scrollIndicator}
          style={{
            position: "fixed",
            bottom: "8px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            background: "var(--gray-3)",
            borderRadius: "var(--radius-2)",
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            pointerEvents: "none",
          }}
        >
          <Text size="1" color="gray">
            Scroll for more
          </Text>
          <ChevronDownIcon width={12} height={12} />
        </Box>
      )}

      <Box
        style={{
          width: "100%",
          ...(isVirtualized
            ? {
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: "relative",
              }
            : {}),
        }}
      >
        {isVirtualized
          ? rowVirtualizer
              .getVirtualItems()
              .map((virtualRow) => (
                <DirectoryRow
                  key={items[virtualRow.index].path}
                  item={items[virtualRow.index]}
                  index={virtualRow.index}
                  itemHeight={virtualRow.size}
                  virtualRow={{ start: virtualRow.start }}
                  {...rowProps}
                />
              ))
          : items.map((item, index) => (
              <DirectoryRow
                key={item.path}
                item={item}
                index={index}
                itemHeight={getItemHeight(index)}
                {...rowProps}
              />
            ))}
      </Box>
    </Box>
  );
}
