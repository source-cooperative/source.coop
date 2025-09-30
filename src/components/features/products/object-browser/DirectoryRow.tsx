"use client";

import { Box, Flex } from "@radix-ui/themes";
import { ChevronRightIcon, FileIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { MonoText } from "@/components/core";
import type { FileNode } from "./utils";
import type { Product } from "@/types";
import { formatFileSize } from "./utils";
import { objectUrl } from "@/lib/urls";
import styles from "./ObjectBrowser.module.css";

interface DirectoryRowProps {
  item: FileNode;
  index: number;
  itemsLength: number;
  itemHeight: number;
  product: Product;
  path: string[];
  focusedIndex?: number;
  setFocusedIndex?: (index: number) => void;
  itemRefs?: React.MutableRefObject<(HTMLAnchorElement | null)[]>;
  virtualRow?: { start: number };
}

export function DirectoryRow({
  item,
  index,
  itemsLength,
  itemHeight,
  product,
  path,
  focusedIndex,
  setFocusedIndex,
  itemRefs,
  virtualRow,
}: DirectoryRowProps) {
  const href = item.isDirectory
    ? objectUrl(
        product.account_id,
        product.product_id,
        [...path, item.name].join("/")
      )
    : objectUrl(product.account_id, product.product_id, item.path);

  const wrapperStyle = virtualRow
    ? {
        position: "absolute" as const,
        top: 0,
        transform: `translateY(${virtualRow.start}px)`,
        left: 0,
        width: "100%",
        height: `${itemHeight}px`,
        willChange: "transform" as const,
      }
    : {
        marginBottom: index < itemsLength - 1 ? "var(--space-2)" : 0,
      };

  return (
    <Box key={item.path} style={wrapperStyle}>
      <Link
        href={href}
        className={styles.item}
        title={item.name}
        ref={(el: HTMLAnchorElement | null) => {
          if (el && itemRefs) itemRefs.current[index] = el;
        }}
        onFocus={() => setFocusedIndex?.(index)}
        data-focused={focusedIndex === index}
      >
        <Flex justify="between" align="center" style={{ width: "100%" }}>
          <Flex align="center" gap="2" style={{ minWidth: 0, flex: 1 }}>
            {item.isDirectory ? (
              <ChevronRightIcon width={16} height={16} />
            ) : (
              <FileIcon width={16} height={16} />
            )}
            <MonoText
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
                flex: 1,
              }}
            >
              {item.name}
            </MonoText>
          </Flex>
          {!item.isDirectory && item.size > 0 && (
            <MonoText style={{ flexShrink: 0, marginLeft: "var(--space-2)" }}>
              {formatFileSize(item.size)}
            </MonoText>
          )}
        </Flex>
      </Link>
    </Box>
  );
}
