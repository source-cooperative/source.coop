"use client";
import { useMemo } from "react";
import NextLink from "next/link";
import {
  Flex,
  DropdownMenu,
  Text,
  Badge,
  Box,
  Progress,
  IconButton,
  ScrollArea,
  Link,
} from "@radix-ui/themes";
import {
  UploadIcon,
  Cross2Icon,
  ReloadIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import { useUploadManager } from "@/components";
import { productUrl, formatBytes } from "@/lib";

export function UploadsSubmenu() {
  const { uploads, cancelUpload, retryUpload } = useUploadManager();

  // Calculate active uploads (queued, uploading)
  const activeUploads = useMemo(() => {
    return uploads.filter(
      (upload) => upload.status === "queued" || upload.status === "uploading"
    );
  }, [uploads]);

  // Don't render if no active uploads
  if (activeUploads.length === 0) {
    return null;
  }

  console.log({ activeUploads });

  return (
    <>
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger>
          <Flex align="center" gap="2">
            <UploadIcon />
            Uploads
            <Badge color="blue" size="1" style={{ marginLeft: "auto" }}>
              {activeUploads.length}
            </Badge>
          </Flex>
        </DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent
          style={{ minWidth: "320px", maxWidth: "320px" }}
        >
          <ScrollArea style={{ maxHeight: "300px" }}>
            <Flex direction="column" gap="2">
              {activeUploads.map((upload) => (
                <Flex
                  direction="column"
                  gap="2"
                  key={upload.id}
                  style={{
                    padding: "var(--space-2)",
                    backgroundColor: "var(--gray-2)",
                    borderRadius: "var(--radius-2)",
                  }}
                >
                  {/* File name and scope */}
                  <Flex justify="between" align="start">
                    <Flex direction="column" style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        size="2"
                        weight="medium"
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {upload.key.split("/").pop()}
                      </Text>
                      <Link size="1" color="gray" asChild>
                        <NextLink
                          href={
                            productUrl(
                              upload.scope.accountId,
                              upload.scope.productId
                            ) +
                            "/" +
                            upload.key.split("/").slice(0, -1).join("/")
                          }
                        >
                          {upload.scope.accountId}/{upload.scope.productId}
                        </NextLink>
                      </Link>
                    </Flex>
                    <Flex gap="1">
                      {upload.status === "error" && (
                        <IconButton
                          size="1"
                          variant="ghost"
                          color="blue"
                          onClick={() => retryUpload(upload.id)}
                        >
                          <ReloadIcon />
                        </IconButton>
                      )}
                      {(upload.status === "uploading" ||
                        upload.status === "queued") && (
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

                  {/* Status and size */}
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

                  {/* Progress bar */}
                  {upload.status === "uploading" && (
                    <Progress
                      value={(upload.uploadedBytes / upload.totalBytes) * 100}
                      size="1"
                    />
                  )}

                  {/* Error message */}
                  {upload.error && (
                    <Text size="1" color="red">
                      {upload.error}
                    </Text>
                  )}
                </Flex>
              ))}
            </Flex>
          </ScrollArea>
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
      <DropdownMenu.Separator />
    </>
  );
}

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
