"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  Flex,
  Text,
  Button,
  Card,
  Badge,
  Progress,
  Separator,
  ScrollArea,
} from "@radix-ui/themes";
import {
  UploadIcon,
  Cross2Icon,
  ReloadIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import { useUploadManager, ScopedUploadItem } from "./UploadProvider";
import { CredentialsScope } from "./CredentialsProvider";

interface GlobalUploadDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalUploadDrawer({ open, onOpenChange }: GlobalUploadDrawerProps) {
  const {
    uploads,
    cancelUpload,
    retryUpload,
    clearUploads,
    getUploadsByScope,
  } = useUploadManager();

  const [selectedScope, setSelectedScope] = useState<string | null>(null);

  // Group uploads by scope (memoized for performance)
  const uploadsByScope = useMemo(() => getUploadsByScope(), [uploads]);
  const scopes = useMemo(
    () => Array.from(uploadsByScope.keys()),
    [uploadsByScope]
  );

  // Get uploads to display (filtered by selected scope if any)
  const displayUploads = selectedScope
    ? uploadsByScope.get(selectedScope) || []
    : uploads;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckIcon width={16} height={16} color="green" />;
      case "error":
        return <ExclamationTriangleIcon width={16} height={16} color="red" />;
      case "uploading":
        return <UploadIcon width={16} height={16} color="blue" />;
      case "queued":
        return <UploadIcon width={16} height={16} color="gray" />;
      case "cancelled":
        return <Cross2Icon width={16} height={16} color="gray" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "green";
      case "error":
        return "red";
      case "uploading":
        return "blue";
      case "queued":
        return "gray";
      case "cancelled":
        return "gray";
      default:
        return "gray";
    }
  };

  const formatScopeName = (scopeKey: string) => {
    const [accountId, productId] = scopeKey.split(":");
    return `${accountId}/${productId}`;
  };

  const getProgressPercent = (upload: ScopedUploadItem) => {
    if (upload.status === "completed") return 100;
    if (upload.status === "error" || upload.status === "cancelled") return 0;
    return (upload.uploadedBytes / upload.totalBytes) * 100;
  };

  const canRetry = (upload: ScopedUploadItem) => upload.status === "error";
  const canCancel = (upload: ScopedUploadItem) =>
    upload.status === "uploading" || upload.status === "queued";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 600, maxHeight: 500 }}>
        <Dialog.Title>Upload Manager</Dialog.Title>
        <Dialog.Description>
          Manage uploads across all products
        </Dialog.Description>

        <Flex direction="column" gap="3" style={{ height: 400 }}>
          {/* Scope Filter */}
          {scopes.length > 1 && (
            <Flex gap="2" wrap="wrap">
              <Button
                variant={selectedScope === null ? "solid" : "soft"}
                size="1"
                onClick={() => setSelectedScope(null)}
              >
                All ({uploads.length})
              </Button>
              {scopes.map((scopeKey) => {
                const scopeUploads = uploadsByScope.get(scopeKey) || [];
                return (
                  <Button
                    key={scopeKey}
                    variant={selectedScope === scopeKey ? "solid" : "soft"}
                    size="1"
                    onClick={() => setSelectedScope(scopeKey)}
                  >
                    {formatScopeName(scopeKey)} ({scopeUploads.length})
                  </Button>
                );
              })}
            </Flex>
          )}

          {/* Upload List */}
          <ScrollArea style={{ flex: 1 }}>
            <Flex direction="column" gap="2">
              {displayUploads.length === 0 ? (
                <Text
                  color="gray"
                  size="2"
                  align="center"
                  style={{ padding: 20 }}
                >
                  No uploads
                </Text>
              ) : (
                displayUploads.map((upload: ScopedUploadItem) => (
                  <Card key={upload.id} size="1">
                    <Flex direction="column" gap="2">
                      <Flex justify="between" align="center">
                        <Flex align="center" gap="2">
                          {getStatusIcon(upload.status)}
                          <Text size="2" weight="medium">
                            {upload.file.name}
                          </Text>
                          <Badge color={getStatusColor(upload.status)} size="1">
                            {upload.status}
                          </Badge>
                        </Flex>
                        <Flex gap="1">
                          {canRetry(upload) && (
                            <Button
                              size="1"
                              variant="soft"
                              color="amber"
                              onClick={() => retryUpload(upload.id)}
                            >
                              <ReloadIcon width={12} height={12} />
                            </Button>
                          )}
                          {canCancel(upload) && (
                            <Button
                              size="1"
                              variant="soft"
                              color="red"
                              onClick={() => cancelUpload(upload.id)}
                            >
                              <Cross2Icon width={12} height={12} />
                            </Button>
                          )}
                        </Flex>
                      </Flex>

                      {/* Progress Bar */}
                      {(upload.status === "uploading" ||
                        upload.status === "queued") && (
                        <Progress
                          value={getProgressPercent(upload)}
                          color={getStatusColor(upload.status)}
                        />
                      )}

                      {/* Error Message */}
                      {upload.status === "error" && upload.error && (
                        <Text size="1" color="red">
                          {upload.error}
                        </Text>
                      )}

                      {/* Scope Info */}
                      <Text size="1" color="gray">
                        {formatScopeName(
                          `${upload.scope.accountId}:${upload.scope.productId}`
                        )}{" "}
                        • {upload.key}
                      </Text>
                    </Flex>
                  </Card>
                ))
              )}
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
                  <Button
                    size="1"
                    variant="soft"
                    color="gray"
                    onClick={() =>
                      clearUploads(
                        "cancelled",
                        selectedScope
                          ? {
                              accountId: selectedScope.split(":")[0],
                              productId: selectedScope.split(":")[1],
                            }
                          : undefined
                      )
                    }
                  >
                    Remove Cancelled
                  </Button>
                </Flex>
                <Button
                  size="1"
                  variant="soft"
                  color="red"
                  onClick={() => {
                    // Cancel all uploads for selected scope
                    displayUploads.forEach((upload: ScopedUploadItem) => {
                      if (canCancel(upload)) {
                        cancelUpload(upload.id);
                      }
                    });
                  }}
                >
                  Cancel All
                </Button>
              </Flex>
            </>
          )}
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
