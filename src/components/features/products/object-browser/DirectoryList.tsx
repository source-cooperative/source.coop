"use client";

import { Box, Text } from "@radix-ui/themes";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { useRef, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MonoText } from "@/components/core";
import { buildDirectoryTree, type FileNode } from "./utils";
import type { Product, ProductObject } from "@/types";
import styles from "./ObjectBrowser.module.css";
import { DirectoryRow } from "./DirectoryRow";

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
  console.log("items", items);

  const parentRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

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

  if (items.length === 0) {
    return (
      <Box p="4">
        <MonoText color="gray">This directory is empty.</MonoText>
      </Box>
    );
  }

  const isVirtualized = items.length > MAX_VISIBLE_ITEMS;

  return (
    <Box
      ref={parentRef}
      style={{
        ...(isVirtualized
          ? {
              maxHeight: `${Math.min(
                items.length * ITEM_HEIGHT,
                MAX_VISIBLE_ITEMS * ITEM_HEIGHT
              )}px`,
              overflow: "auto",
              willChange: "transform",
              position: "relative",
            }
          : {}),
      }}
    >
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
  );
}
