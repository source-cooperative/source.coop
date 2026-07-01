"use client";

import { Box, Text } from "@radix-ui/themes";
import { UploadIcon } from "@radix-ui/react-icons";
import { useDropzone } from "react-dropzone";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/types";
import {
  useS3Credentials,
  useUploadManager,
} from "@/components/features/uploader";

interface DirectoryListProps {
  product: Product;
  prefix: string;
}

export function Dropzone({
  prefix,
  product,
  children,
}: React.PropsWithChildren<DirectoryListProps>) {
  const { getCredentials } = useS3Credentials();
  const { uploadFiles, getUploadsForScope } = useUploadManager();
  const router = useRouter();
  const scope = {
    accountId: product.account_id,
    productId: product.product_id,
  };
  const uploadEnabled = getCredentials(scope);

  // Re-fetch the server render when this product's uploads drain, so a re-upload
  // to an existing path shows its new content/metadata instead of the stale
  // version. Lives here (always mounted for the product route) rather than in
  // the directory list, which isn't rendered while viewing a single file.
  const hasActiveUploads = getUploadsForScope(scope).some(
    (u) => u.status === "uploading" || u.status === "queued"
  );
  const wasActive = useRef(false);
  useEffect(() => {
    if (wasActive.current && !hasActiveUploads) router.refresh();
    wasActive.current = hasActiveUploads;
  }, [hasActiveUploads, router]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      if (!uploadEnabled) return;
      uploadFiles(files, prefix, scope);
    },
    noClick: true, // Don't open file browser on click
    // noKeyboard: true,
    disabled: !uploadEnabled,
  });

  return (
    <Box
      {...(uploadEnabled ? getRootProps() : {})}
      style={{
        position: "relative",
        ...(isDragActive && uploadEnabled
          ? {
              border: "3px dashed var(--accent-9)",
              borderRadius: "var(--radius-2)",
              padding: "4px",
            }
          : {}),
      }}
    >
      <input {...getInputProps()} />
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      {isDragActive && uploadEnabled && (
        <Box
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            borderRadius: "var(--radius-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            pointerEvents: "none",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <Box
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <UploadIcon width={48} height={48} color="white" />
            <Text
              size="6"
              weight="medium"
              style={{
                color: "white",
              }}
            >
              Drop files here to upload
            </Text>
          </Box>
        </Box>
      )}
      {children}
    </Box>
  );
}
