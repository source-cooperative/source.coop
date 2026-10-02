"use client";
import { useMemo } from "react";
import NextLink from "next/link";
import {
  Flex,
  DropdownMenu,
  Text,
  Badge,
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
import { useUploadManager } from "@/components/features/uploader/UploadProvider";
import { productUrl } from "@/lib/urls";
import { formatBytes } from "@/lib/format";
import { DeleteProgress } from "./DeleteProgress";

// A folder upload queues one entry per file; rendering thousands hangs the tab.
const MAX_SHOWN = 100;

/** Uploads and deletes running in this tab, under the account menu. */
export function ActivitySubmenu() {
  const { uploads, cancelUpload, retryUpload, deletions, dismissDeletion } =
    useUploadManager();

  // Calculate active uploads (queued, uploading)
  const activeUploads = useMemo(() => {
    return uploads.filter(
      (upload) => upload.status === "queued" || upload.status === "uploading"
    );
  }, [uploads]);

  // Failed deletes stay until dismissed: they may have left a folder half-gone.
  const shownDeletions = deletions.filter((d) => d.status !== "completed");
  const activeCount =
    activeUploads.length +
    shownDeletions.filter((d) => d.status === "deleting").length;
  const deletionsShown = shownDeletions.slice(0, MAX_SHOWN);
  const uploadsShown = activeUploads.slice(
    0,
    MAX_SHOWN - deletionsShown.length
  );
  const hidden =
    shownDeletions.length +
    activeUploads.length -
    deletionsShown.length -
    uploadsShown.length;

  if (activeUploads.length === 0 && shownDeletions.length === 0) {
    return null;
  }

  return (
    <>
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger>
          <Flex align="center" gap="2">
            <UploadIcon />
            Activity
            {activeCount > 0 && (
              <Badge color="blue" size="1" style={{ marginLeft: "auto" }}>
                {activeCount}
              </Badge>
            )}
          </Flex>
        </DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent
          style={{ minWidth: "320px", maxWidth: "320px" }}
        >
          <ScrollArea style={{ maxHeight: "300px" }}>
            <Flex direction="column" gap="2">
              {deletionsShown.map((job) => (
                <DeleteProgress
                  key={job.id}
                  job={job}
                  onDismiss={() => dismissDeletion(job.id)}
                />
              ))}
              {uploadsShown.map((upload) => {
                const uploadPrefix =
                  productUrl(upload.scope.accountId, upload.scope.productId) +
                  "/" +
                  upload.key.split("/").slice(0, -1).join("/");
                return (
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
                          <NextLink href={uploadPrefix}>
                            {uploadPrefix}
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
                );
              })}
              {hidden > 0 && (
                <Text size="1" color="gray" align="center">
                  and {hidden.toLocaleString("en")} more…
                </Text>
              )}
            </Flex>
          </ScrollArea>
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
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
