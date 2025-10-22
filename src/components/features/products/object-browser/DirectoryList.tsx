"use client";

import { Box, Text } from "@radix-ui/themes";
import { ChevronDownIcon, UploadIcon } from "@radix-ui/react-icons";
import { useRef, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MonoText } from "@/components/core";
import { buildDirectoryTree } from "./utils";
import type { Product, ProductObject } from "@/types";
import styles from "./ObjectBrowser.module.css";
import { DirectoryRow } from "./DirectoryRow";
import { useS3Credentials } from "../uploader";

interface DirectoryListProps {
  product: Product;
  objects: ProductObject[]; // Allow parent to pass objects to avoid duplicate calls
  path: string[];
  focusedIndex?: number;
  setFocusedIndex?: (index: number) => void;
}

const MAX_VISIBLE_ITEMS = 20;
const ITEM_HEIGHT = 40;

function getSortedItems(objects: ProductObject[], path: string[]) {
  const tree = buildDirectoryTree(objects, path);
  return Object.values(tree).sort((a, b) => {
    // Directories first, then alphabetically
    if (a.isDirectory && !b.isDirectory) return -1;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

export function DirectoryList({
  objects,
  path,
  product,
  focusedIndex = 0,
  setFocusedIndex,
}: DirectoryListProps) {
  const items = getSortedItems(objects, path);

  const parentRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Dropzone for file uploads
  const { s3Credentials } = useS3Credentials();
  const uploadEnabled = Boolean(s3Credentials);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    // onDrop: (files) => {
    //   if (!uploadEnabled) return;
    //   uploadFiles(files, prefix);
    // },
    noClick: true, // Don't open file browser on click
    noKeyboard: true,
    disabled: !uploadEnabled,
  });

  // Set up virtualizer when enabled
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 3,
    scrollPaddingStart: ITEM_HEIGHT / 2,
    scrollPaddingEnd: ITEM_HEIGHT / 2,
    enabled: true,
  });

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

  const isVirtualized = items.length > MAX_VISIBLE_ITEMS;

  return (
    <Box
      {...(uploadEnabled ? getRootProps() : {})}
      style={{
        position: "relative",
        ...(isDragActive && uploadEnabled
          ? {
              border: "3px dashed var(--accent-9)",
              borderRadius: "var(--radius-2)",
              padding: "4px",
            }
          : {}),
      }}
    >
      <input {...getInputProps()} />
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      {isDragActive && uploadEnabled && (
        <Box
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            borderRadius: "var(--radius-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            pointerEvents: "none",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <Box
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <UploadIcon width={48} height={48} color="white" />
            <Text
              size="6"
              weight="medium"
              style={{
                color: "white",
              }}
            >
              Drop files here to upload
            </Text>
          </Box>
        </Box>
      )}
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
            ...(isVirtualized
              ? {
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  position: "relative",
                  width: "100%",
                }
              : { width: "100%" }),
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
                    itemsLength={items.length}
                    itemHeight={ITEM_HEIGHT}
                    product={product}
                    path={path}
                    focusedIndex={focusedIndex}
                    setFocusedIndex={setFocusedIndex}
                    itemRefs={itemRefs}
                    virtualRow={{ start: virtualRow.start }}
                  />
                ))
            : items.map((item, index) => (
                <DirectoryRow
                  key={item.path}
                  item={item}
                  index={index}
                  itemsLength={items.length}
                  itemHeight={ITEM_HEIGHT}
                  product={product}
                  path={path}
                  focusedIndex={focusedIndex}
                  setFocusedIndex={setFocusedIndex}
                  itemRefs={itemRefs}
                />
              ))}
        </Box>
      </Box>
    </Box>
  );
}
