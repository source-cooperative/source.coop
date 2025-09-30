"use client";

import { Box, Flex, Tooltip, IconButton } from "@radix-ui/themes";
import {
  ChevronRightIcon,
  FileIcon,
  DownloadIcon,
  CopyIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { MonoText } from "@/components/core";
import type { FileNode } from "./utils";
import type { Product } from "@/types";
import { formatFileSize } from "./utils";
import { objectUrl } from "@/lib/urls";
import styles from "./ObjectBrowser.module.css";
import { useState } from "react";

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
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const href = item.isDirectory
    ? objectUrl(
        product.account_id,
        product.product_id,
        [...path, item.name].join("/")
      )
    : objectUrl(product.account_id, product.product_id, item.path);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => {
        setCopiedField(null);
      }, 1500);
    });
  };

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
      <Flex justify="between" align="center" style={{ width: "100%" }}>
        <Box style={{ minWidth: 0, flex: 1 }}>
          <Link
            href={href}
            className={styles.item}
            title={item.name}
            ref={(el: HTMLAnchorElement | null) => {
              if (el && itemRefs) itemRefs.current[index] = el;
            }}
            onFocus={() => setFocusedIndex?.(index)}
            data-focused={focusedIndex === index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              minWidth: 0,
              flex: 1,
            }}
          >
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
          </Link>
        </Box>

        <Box>
          <Flex align="center" gap="2">
            {/* File size */}
            {!item.isDirectory && item.size > 0 && (
              <MonoText color="gray" size="1" style={{ flexShrink: 0 }}>
                {formatFileSize(item.size)}
              </MonoText>
            )}

            {/* Two buttons for files */}
            {!item.isDirectory && (
              <Flex gap="1">
                {/* Primary Download Button */}
                <Tooltip content={`Download ${item.name}`}>
                  <IconButton
                    variant="solid"
                    size="1"
                    asChild
                    style={{ minWidth: "auto" }}
                  >
                    <a
                      href={`https://data.source.coop/${product.account_id}/${product.product_id}/${item.path}`}
                      download={item.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DownloadIcon width={14} height={14} />
                    </a>
                  </IconButton>
                </Tooltip>

                {/* Secondary Copy URL Button */}
                <Tooltip content={`Copy URL to clipboard`}>
                  <IconButton
                    variant="surface"
                    size="1"
                    color={copiedField === `url-${index}` ? "green" : "gray"}
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(
                        `https://data.source.coop/${product.account_id}/${product.product_id}/${item.path}`,
                        `url-${index}`
                      );
                    }}
                    style={{ minWidth: "auto", cursor: "pointer" }}
                  >
                    {copiedField === `url-${index}` ? (
                      <CheckIcon />
                    ) : (
                      <CopyIcon />
                    )}
                  </IconButton>
                </Tooltip>
              </Flex>
            )}
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
}
