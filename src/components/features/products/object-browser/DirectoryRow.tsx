"use client";

import {
  Box,
  Flex,
  Tooltip,
  IconButton,
  AlertDialog,
  Button,
  Text,
  Spinner,
} from "@radix-ui/themes";
import {
  ChevronRightIcon,
  FileIcon,
  DownloadIcon,
  CopyIcon,
  CheckIcon,
  Cross2Icon,
  ReloadIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MonoText } from "@/components/core/MonoText";
import type { FileNode } from "./utils";
import type { Product } from "@/types";
import { formatBytes } from "@/lib/format";
import { objectUrl } from "@/lib/urls";
import styles from "./ObjectBrowser.module.css";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  useUploadManager,
  useS3Credentials,
  useDeleteStatusText,
} from "@/components/features/uploader";

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
  /** Called with the item's path after a successful delete, so the list can
      hide it immediately without waiting for the (eventually-consistent) refetch. */
  onDeleted?: (path: string) => void;
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
  onDeleted,
}: DirectoryRowProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();
  const {
    cancelUpload,
    retryUpload,
    getUploadsForScope,
    deletions,
    deletePath,
  } = useUploadManager();
  const { getCredentials } = useS3Credentials();
  const deleteStatusText = useDeleteStatusText();
  const t = useTranslations("DirectoryRow");
  const tCommon = useTranslations("Common");

  // Get uploads for this specific product scope
  const scope = {
    accountId: product.account_id,
    productId: product.product_id,
  };
  const scopedUploads = getUploadsForScope(scope);

  // Edit mode is "user has fetched write credentials for this product" — the
  // same signal the upload controls use. Delete is gated on it.
  const canEdit = !!getCredentials(scope);

  const deletion = deletions.find(
    (d) =>
      d.path === item.path &&
      d.scope.accountId === scope.accountId &&
      d.scope.productId === scope.productId
  );
  const deleting = deletion?.status === "deleting";

  // The delete runs in the background (progress in the account menu), so the
  // dialog closes at once and the user can keep browsing. A failure is
  // reported there and on this row, whose delete button stays for a retry.
  const handleDelete = () => {
    deletePath(item.path, item.isDirectory, scope)
      .then(() => {
        // Hide it now (the refetch below can be stale), then reconcile.
        onDeleted?.(item.path);
        router.refresh(); // re-fetch the server-rendered listing
      })
      .catch((error) => console.error("Delete failed", error));
  };

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
                  {formatBytes(item.size)}
                </MonoText>
              )}

              {/* Upload control buttons */}
              {!item.isDirectory && isUploading && uploadItem && (
                <Flex gap="1">
                  {/* Retry button for failed uploads */}
                  {item.uploadProgress?.status === "error" && (
                    <Tooltip content={t("retryUpload")}>
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
                    <Tooltip content={t("cancelUpload")}>
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
                  <Tooltip content={t("download", { name: item.name })}>
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
                  <Tooltip content={t("copyUrl")}>
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

              {deleting && (
                <Flex align="center" gap="2">
                  <Spinner size="1" />
                  <Text size="1" color="gray">
                    {deleteStatusText(deletion)}
                  </Text>
                </Flex>
              )}

              {deletion?.status === "error" && (
                <Tooltip content={deletion.error}>
                  <Text size="1" color="red">
                    {t("deleteFailed")}
                  </Text>
                </Tooltip>
              )}

              {/* Delete button — only in edit mode, for files and folders */}
              {canEdit && !isUploading && !deleting && (
                <AlertDialog.Root
                  open={confirmOpen}
                  onOpenChange={setConfirmOpen}
                >
                  <AlertDialog.Trigger>
                    <IconButton
                      variant="soft"
                      size="1"
                      color="red"
                      onClick={(e) => e.stopPropagation()}
                      style={{ minWidth: "auto", cursor: "pointer" }}
                      aria-label={t("deleteItem", { name: item.name })}
                    >
                      <TrashIcon width={14} height={14} />
                    </IconButton>
                  </AlertDialog.Trigger>
                  <AlertDialog.Content maxWidth="450px">
                    <AlertDialog.Title>
                      {item.isDirectory
                        ? t("deleteFolderTitle")
                        : t("deleteFileTitle")}
                    </AlertDialog.Title>
                    <AlertDialog.Description size="2">
                      {t.rich(
                        item.isDirectory
                          ? "deleteFolderConfirm"
                          : "deleteFileConfirm",
                        {
                          name: item.name,
                          strong: (chunks) => <strong>{chunks}</strong>,
                        }
                      )}
                    </AlertDialog.Description>
                    <Flex gap="3" mt="4" justify="end">
                      <AlertDialog.Cancel>
                        <Button variant="soft" color="gray">
                          {tCommon("cancel")}
                        </Button>
                      </AlertDialog.Cancel>
                      <AlertDialog.Action>
                        <Button color="red" onClick={handleDelete}>
                          {tCommon("delete")}
                        </Button>
                      </AlertDialog.Action>
                    </Flex>
                  </AlertDialog.Content>
                </AlertDialog.Root>
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
              {item.uploadProgress?.status === "queued" && t("queued")}
              {item.uploadProgress?.status === "uploading" &&
                t("uploading", { percent: Math.round(progressPercent) })}
              {item.uploadProgress?.status === "error" &&
                t("uploadError", { error: item.uploadProgress.error ?? "" })}
              {item.uploadProgress?.status === "cancelled" && t("cancelled")}
            </MonoText>
          </>
        )}
      </Flex>
    </Box>
  );
}
