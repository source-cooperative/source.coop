"use client";

import { Box, Text, Flex } from "@radix-ui/themes";
import {
  ChevronRightIcon,
  FileIcon,
  ChevronDownIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MonoText } from "@/components/core";
import type { FileNode } from "./utils";
import type { Product } from "@/types";
import { formatFileSize } from "./utils";
import styles from "../ObjectBrowser.module.css";

interface DirectoryListProps {
  items: FileNode[];
  currentPath: string[];
  focusedIndex: number;
  itemRefs: React.MutableRefObject<(HTMLAnchorElement | null)[]>;
  product: Product;
  setFocusedIndex: (index: number) => void;
  isLoading: boolean;
}

interface DirectoryRowProps {
  item: FileNode;
  index: number;
  itemsLength: number;
  product: Product;
  currentPath: string[];
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  itemRefs: React.MutableRefObject<(HTMLAnchorElement | null)[]>;
  virtualRow?: { start: number };
}

const ITEM_HEIGHT = 40;
const MAX_VISIBLE_ITEMS = 20;

function DirectoryRow({
  item,
  index,
  itemsLength,
  product,
  currentPath,
  focusedIndex,
  setFocusedIndex,
  itemRefs,
  virtualRow,
}: DirectoryRowProps) {
  const href = item.isDirectory
    ? `/${product.account_id}/${product.product_id}/${[
        ...currentPath,
        item.name,
      ].join("/")}`
    : `/${product.account_id}/${product.product_id}/${item.path}`;

  const wrapperStyle = virtualRow
    ? {
        position: "absolute" as const,
        top: 0,
        transform: `translateY(${virtualRow.start}px)`,
        left: 0,
        width: "100%",
        height: `${ITEM_HEIGHT}px`,
        willChange: "transform" as const,
      }
    : {
        marginBottom: index < itemsLength - 1 ? "var(--space-2)" : 0,
      };

  return (
    <Box key={item.path} style={wrapperStyle}>
      <Link
        ref={(el) => {
          if (el) itemRefs.current[index] = el;
        }}
        href={href}
        onFocus={() => setFocusedIndex(index)}
        className={styles.item}
        data-focused={focusedIndex === index}
      >
        <Flex justify="between" align="center" style={{ width: "100%" }}>
          <Flex align="center" gap="2">
            {item.isDirectory ? (
              <ChevronRightIcon width={16} height={16} />
            ) : (
              <FileIcon width={16} height={16} />
            )}
            <MonoText>{item.name}</MonoText>
          </Flex>
          {!item.isDirectory && item.size > 0 && (
            <MonoText>{formatFileSize(item.size)}</MonoText>
          )}
        </Flex>
      </Link>
    </Box>
  );
}

export function DirectoryList({
  items,
  currentPath,
  focusedIndex,
  itemRefs,
  product,
  setFocusedIndex,
  isLoading,
}: DirectoryListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Set up virtualizer with simple configuration
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 3,
    scrollPaddingStart: ITEM_HEIGHT / 2,
    scrollPaddingEnd: ITEM_HEIGHT / 2,
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

  if (isLoading) {
    return <Text color="gray">Loading...</Text>;
  }

  if (items.length === 0) {
    return <Text color="gray">This directory is empty.</Text>;
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
            position: "absolute",
            bottom: "8px",
            left: "50%",
            zIndex: 10,
            background: "var(--gray-3)",
            borderRadius: "var(--radius-2)",
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
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
                  product={product}
                  currentPath={currentPath}
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
                product={product}
                currentPath={currentPath}
                focusedIndex={focusedIndex}
                setFocusedIndex={setFocusedIndex}
                itemRefs={itemRefs}
              />
            ))}
      </Box>
    </Box>
  );
}
