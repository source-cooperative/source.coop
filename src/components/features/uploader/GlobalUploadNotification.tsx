"use client";

import { useState, useEffect, useMemo } from "react";
import NextLink from "next/link";
import {
  Flex,
  Text,
  Button,
  Card,
  Badge,
  Progress,
  Separator,
  ScrollArea,
  IconButton,
  Link,
  Box,
} from "@radix-ui/themes";
import {
  UploadIcon,
  Cross2Icon,
  ReloadIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";
import { useUploadManager, ScopedUploadItem } from "./UploadProvider";
import { formatBytes } from "@/lib/format";

export function GlobalUploadNotification() {
  const {
    uploads,
    cancelUpload,
    retryUpload,
    clearUploads,
    getUploadsByScope,
  } = useUploadManager();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedScope, setSelectedScope] = useState<string | null>(null);

  // Filter for queued and active uploads only
  const activeUploads = useMemo(() => {
    return uploads.filter(
      (upload) => upload.status === "queued" || upload.status === "uploading"
    );
  }, [uploads]);

  // Group active uploads by scope
  const uploadsByScope = useMemo(() => {
    const result = new Map<string, ScopedUploadItem[]>();
    activeUploads.forEach((upload) => {
      const key = `${upload.scope.accountId}:${upload.scope.productId}`;
      if (!result.has(key)) result.set(key, []);
      result.get(key)!.push(upload);
    });
    return result;
  }, [activeUploads]);

  const scopes = useMemo(
    () => Array.from(uploadsByScope.keys()),
    [uploadsByScope]
  );

  // Get uploads to display (filtered by selected scope if any)
  const displayUploads = selectedScope
    ? uploadsByScope.get(selectedScope) || []
    : activeUploads;

  // Auto-open when there are active uploads, auto-close when none
  useEffect(() => {
    if (activeUploads.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setIsMinimized(false);
    }
  }, [activeUploads.length]);

  // Don't render if no active uploads
  if (activeUploads.length === 0) {
    return null;
  }

  const formatScopeName = (scopeKey: string) => {
    const [accountId, productId] = scopeKey.split(":");
    return `${accountId}/${productId}`;
  };

  const getUploadLink = (upload: ScopedUploadItem) => {
    const { accountId, productId } = upload.scope;

    if (upload.status === "completed") {
      // Link to the file path when completed
      return `/${accountId}/${productId}/${upload.key}`;
    } else {
      // Link to the prefix when in progress or queued
      const prefix = upload.key.substring(0, upload.key.lastIndexOf("/") + 1);
      return `/${accountId}/${productId}/${prefix}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "uploading":
        return "blue";
      case "queued":
        return "gray";
      case "completed":
        return "green";
      case "error":
        return "red";
      case "cancelled":
        return "gray";
      default:
        return "gray";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "uploading":
        return <UploadIcon />;
      case "queued":
        return <UploadIcon />;
      case "completed":
        return <CheckIcon />;
      case "error":
        return <ExclamationTriangleIcon />;
      case "cancelled":
        return <Cross2Icon />;
      default:
        return <UploadIcon />;
    }
  };

  const canRetry = (upload: ScopedUploadItem) => upload.status === "error";
  const canCancel = (upload: ScopedUploadItem) =>
    upload.status === "uploading" || upload.status === "queued";

  const totalUploads = activeUploads.length;
  const completedCount = activeUploads.filter(
    (u) => u.status === "completed"
  ).length;
  const errorCount = activeUploads.filter((u) => u.status === "error").length;
  const uploadingCount = activeUploads.filter(
    (u) => u.status === "uploading"
  ).length;
  const queuedCount = activeUploads.filter((u) => u.status === "queued").length;

  return (
    <Box
      style={{
        maxWidth: 500,
        maxHeight: isMinimized ? 60 : 400,
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 1000,
        backgroundColor: "var(--color-panel)",
        border: "1px solid var(--gray-6)",
        borderRadius: "var(--radius-3)",
        boxShadow: "var(--shadow-4)",
        padding: "var(--space-3)",
        display: isOpen ? "block" : "none",
      }}
    >
      <Flex direction="column" gap="3">
        {/* Header */}
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <UploadIcon />
            <Text size="2" weight="medium">
              Uploads ({totalUploads})
            </Text>
            {uploadingCount > 0 && (
              <Badge color="blue" variant="soft">
                {uploadingCount} uploading
              </Badge>
            )}
            {queuedCount > 0 && (
              <Badge color="gray" variant="soft">
                {queuedCount} queued
              </Badge>
            )}
          </Flex>
          <Flex gap="1">
            <IconButton
              size="1"
              variant="ghost"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </IconButton>
            <IconButton
              size="1"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              <Cross2Icon />
            </IconButton>
          </Flex>
        </Flex>

        {!isMinimized && (
          <>
            {/* Scope Filter */}
            {scopes.length > 1 && (
              <Flex gap="2" wrap="wrap">
                <Button
                  size="1"
                  variant={selectedScope === null ? "solid" : "soft"}
                  onClick={() => setSelectedScope(null)}
                >
                  All ({totalUploads})
                </Button>
                {scopes.map((scope) => {
                  const scopeUploads = uploadsByScope.get(scope) || [];
                  return (
                    <Button
                      key={scope}
                      size="1"
                      variant={selectedScope === scope ? "solid" : "soft"}
                      onClick={() => setSelectedScope(scope)}
                    >
                      {formatScopeName(scope)} ({scopeUploads.length})
                    </Button>
                  );
                })}
              </Flex>
            )}

            {/* Upload List */}
            <ScrollArea style={{ maxHeight: 200 }}>
              <Flex direction="column" gap="2">
                {displayUploads.map((upload) => (
                  <Card key={upload.id} size="1">
                    <Flex direction="column" gap="2">
                      <Flex justify="between" align="center">
                        <Flex direction="column" style={{ flex: 1 }}>
                          <Text size="2" weight="medium">
                            {upload.key.split("/").pop()}
                          </Text>
                          <Text size="1" color="gray">
                            {upload.scope.accountId}/{upload.scope.productId}
                          </Text>
                        </Flex>
                        <Flex gap="1">
                          {canRetry(upload) && (
                            <IconButton
                              size="1"
                              variant="ghost"
                              color="blue"
                              onClick={() => retryUpload(upload.id)}
                            >
                              <ReloadIcon />
                            </IconButton>
                          )}
                          {canCancel(upload) && (
                            <IconButton
                              size="1"
                              variant="ghost"
                              color="red"
                              onClick={() => cancelUpload(upload.id)}
                            >
                              <Cross2Icon />
                            </IconButton>
                          )}
                        </Flex>
                      </Flex>

                      <Flex align="center" gap="2">
                        <Badge
                          color={getStatusColor(upload.status)}
                          variant="soft"
                          size="1"
                        >
                          {getStatusIcon(upload.status)}
                          {upload.status}
                        </Badge>
                        <Text size="1" color="gray">
                          {formatBytes(upload.uploadedBytes)} /{" "}
                          {formatBytes(upload.totalBytes)}
                        </Text>
                      </Flex>

                      <Link
                        size="1"
                        color="blue"
                        style={{ alignSelf: "flex-start" }}
                        asChild
                      >
                        <NextLink href={getUploadLink(upload)}>
                          {upload.status === "completed"
                            ? "View file"
                            : "View directory"}
                        </NextLink>
                      </Link>

                      {upload.status === "uploading" && (
                        <Progress
                          value={
                            (upload.uploadedBytes / upload.totalBytes) * 100
                          }
                          size="1"
                        />
                      )}

                      {upload.error && (
                        <Text size="1" color="red">
                          {upload.error}
                        </Text>
                      )}
                    </Flex>
                  </Card>
                ))}
              </Flex>
            </ScrollArea>

            {/* Actions */}
            {displayUploads.length > 0 && (
              <>
                <Separator />
                <Flex justify="between" align="center">
                  <Flex gap="2">
                    <Button
                      size="1"
                      variant="soft"
                      onClick={() =>
                        clearUploads(
                          "completed",
                          selectedScope
                            ? {
                                accountId: selectedScope.split(":")[0],
                                productId: selectedScope.split(":")[1],
                              }
                            : undefined
                        )
                      }
                    >
                      Clear Completed
                    </Button>
                    <Button
                      size="1"
                      variant="soft"
                      color="red"
                      onClick={() =>
                        clearUploads(
                          "error",
                          selectedScope
                            ? {
                                accountId: selectedScope.split(":")[0],
                                productId: selectedScope.split(":")[1],
                              }
                            : undefined
                        )
                      }
                    >
                      Clear Errors
                    </Button>
                  </Flex>
                  <Button
                    size="1"
                    variant="soft"
                    color="red"
                    onClick={() => {
                      if (selectedScope) {
                        const [accountId, productId] = selectedScope.split(":");
                        clearUploads(undefined, { accountId, productId });
                      } else {
                        clearUploads();
                      }
                    }}
                  >
                    Clear All
                  </Button>
                </Flex>
              </>
            )}
          </>
        )}
      </Flex>
    </Box>
  );
}
