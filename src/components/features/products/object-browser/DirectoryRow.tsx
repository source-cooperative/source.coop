"use client";

import { Box, Flex, Tooltip, IconButton } from "@radix-ui/themes";
import {
  ChevronRightIcon,
  FileIcon,
  DownloadIcon,
  CopyIcon,
  CheckIcon,
  Cross2Icon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { MonoText } from "@/components/core";
import type { FileNode } from "./utils";
import type { Product } from "@/types";
import { formatFileSize } from "./utils";
import { objectUrl } from "@/lib/urls";
import styles from "./ObjectBrowser.module.css";
import { useState } from "react";
import { useUploadManager } from "@/components/features/uploader";

interface DirectoryRowProps {
  item: FileNode;
  index: number;
  itemsLength: number;
  itemHeight: number;
  product: Product;
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
  focusedIndex,
  setFocusedIndex,
  itemRefs,
  virtualRow,
}: DirectoryRowProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { cancelUpload, retryUpload, getUploadsForScope } = useUploadManager();

  // Get uploads for this specific product scope
  const scope = {
    accountId: product.account_id,
    productId: product.product_id,
  };
  const scopedUploads = getUploadsForScope(scope);

  // Find the upload ID for this item if it's uploading
  const uploadItem = scopedUploads.find((upload) => upload.key === item.path);

  const href = item.isDirectory
    ? objectUrl(product.account_id, product.product_id, item.path)
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

  const isUploading =
    item.uploadProgress && item.uploadProgress.status !== "completed";
  const progressPercent = item.uploadProgress
    ? (item.uploadProgress.uploadedBytes / item.size) * 100
    : 0;

  return (
    <Box key={item.path} style={wrapperStyle}>
      <Flex
        direction="column"
        gap="1"
        style={{
          width: "100%",
          position: "relative",
        }}
      >
        <Flex justify="between" align="center" style={{ width: "100%" }}>
          <Box style={{ minWidth: 0, flex: 1 }}>
            <Link
              title={item.name}
              href={isUploading ? "#" : href}
              className={styles.item}
              ref={(el: HTMLAnchorElement | null) => {
                if (el && itemRefs) itemRefs.current[index] = el;
              }}
              onFocus={() => setFocusedIndex?.(index)}
              data-focused={focusedIndex === index}
              onClick={(e) => {
                if (isUploading) e.preventDefault();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                minWidth: 0,
                flex: 1,
                opacity: isUploading ? 0.6 : 1,
                cursor: isUploading ? "default" : "pointer",
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

              {/* Upload control buttons */}
              {!item.isDirectory && isUploading && uploadItem && (
                <Flex gap="1">
                  {/* Retry button for failed uploads */}
                  {item.uploadProgress?.status === "error" && (
                    <Tooltip content="Retry upload">
                      <IconButton
                        variant="soft"
                        size="1"
                        color="amber"
                        onClick={(e) => {
                          e.stopPropagation();
                          retryUpload(uploadItem.id);
                        }}
                        style={{ minWidth: "auto", cursor: "pointer" }}
                      >
                        <ReloadIcon width={14} height={14} />
                      </IconButton>
                    </Tooltip>
                  )}

                  {/* Cancel button for active/queued uploads */}
                  {(item.uploadProgress?.status === "uploading" ||
                    item.uploadProgress?.status === "queued") && (
                    <Tooltip content="Cancel upload">
                      <IconButton
                        variant="soft"
                        size="1"
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelUpload(uploadItem.id);
                        }}
                        style={{ minWidth: "auto", cursor: "pointer" }}
                      >
                        <Cross2Icon width={14} height={14} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Flex>
              )}

              {/* Download/Copy buttons for completed files */}
              {!item.isDirectory && !isUploading && (
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

        {isUploading && (
          <>
            {/* Upload Progress Bar */}
            <Box
              style={{
                width: "100%",
                height: "4px",
                backgroundColor: "var(--gray-4)",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <Box
                style={{
                  height: "100%",
                  width: `${progressPercent}%`,
                  backgroundColor:
                    item.uploadProgress?.status === "error"
                      ? "var(--red-9)"
                      : item.uploadProgress?.status === "uploading"
                      ? "var(--accent-9)"
                      : "var(--gray-7)",
                  transition: "width 0.2s ease",
                }}
              />
            </Box>
            {/* Upload Status Text */}
            <MonoText size="1" color="gray" style={{ fontSize: "10px" }}>
              {item.uploadProgress?.status === "queued" && "Queued..."}
              {item.uploadProgress?.status === "uploading" &&
                `Uploading ${Math.round(progressPercent)}%`}
              {item.uploadProgress?.status === "error" &&
                `Error: ${item.uploadProgress.error}`}
              {item.uploadProgress?.status === "cancelled" && "Cancelled"}
            </MonoText>
          </>
        )}
      </Flex>
    </Box>
  );
}
