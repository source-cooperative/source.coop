"use client";
import { Badge } from "@radix-ui/themes";
import { useContext, useMemo } from "react";
import { UploadContext } from "@/components/features/uploader/UploadProvider";

/**
 * Badge indicator showing count of active uploads
 * Displays as a positioned badge overlay (typically on an avatar)
 *
 * Renders nothing if not within an UploadProvider (e.g. marketing pages)
 * since uploads aren't possible there anyway.
 */
export function UploadBadge() {
  const context = useContext(UploadContext);
  const uploads = context?.uploads ?? [];

  // Calculate active uploads (queued, uploading)
  const activeCount = useMemo(() => {
    return uploads.filter(
      (upload) => upload.status === "queued" || upload.status === "uploading"
    ).length;
  }, [uploads]);

  // Don't render if no active uploads
  if (activeCount === 0) {
    return null;
  }

  return (
    <Badge
      color="blue"
      size="1"
      style={{
        position: "absolute",
        top: -4,
        right: -4,
        minWidth: "18px",
        height: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 4px",
        borderRadius: "9px",
        backgroundColor: "var(--blue-9)",
        color: "white",
      }}
    >
      {activeCount}
    </Badge>
  );
}
