import type { ProductObject } from "@/types";
import type { ScopedUploadItem } from "@/components/features/uploader";

export interface FileNode {
  name: string;
  path: string;
  size: number;
  updated_at: string;
  isDirectory: boolean;
  object?: ProductObject;
  // Upload progress fields (only present during upload)
  uploadProgress?: {
    uploadedBytes: number;
    status: ScopedUploadItem["status"];
    error?: string;
  };
}

export const asFileNodes = (objects: ProductObject[]): FileNode[] =>
  objects.map((obj) => ({
    name: obj.path.replace(/\/+$/, "").split("/").pop()!, // Get last segment of path
    path: obj.path,
    size: obj.size,
    updated_at: obj.updated_at,
    isDirectory: obj.type === "directory",
    object: obj,
  }));

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Merge upload progress items with existing file nodes
 * Shows files that are currently uploading alongside completed files
 */
export function mergeUploadsWithFiles(
  fileNodes: FileNode[],
  uploads: ScopedUploadItem[],
  currentPrefix: string
): FileNode[] {
  const files = new Map(fileNodes.map((file) => [file.name, file]));

  // Normalize prefix to ensure consistent comparison
  const normalizedPrefix = currentPrefix.replace(/\/$/, "");

  for (const upload of uploads) {
    // Get the path relative to the current prefix
    const uploadPath = upload.key;

    // Check if upload is under the current prefix
    if (!uploadPath.startsWith(normalizedPrefix)) continue;

    // Get the relative path from the current prefix
    const relativePath = normalizedPrefix
      ? uploadPath.slice(normalizedPrefix.length).replace(/^\//, "")
      : uploadPath;

    // Split into segments to find what should be shown in this directory
    const segments = relativePath.split("/").filter(Boolean);
    if (segments.length === 0) continue;

    // Show the immediate child (file or directory)
    const immediateChild = segments[0];
    const isDirectChild = segments.length === 1;
    const childPath = normalizedPrefix
      ? `${normalizedPrefix}/${immediateChild}${isDirectChild ? "" : "/"}`
      : `${immediateChild}${isDirectChild ? "" : "/"}`;

    if (isDirectChild) {
      // This is a file directly in the current directory
      files.set(immediateChild, {
        // Get existing file or create a new one
        ...(files.get(immediateChild) || {
          name: immediateChild,
          path: uploadPath,
          size: upload.totalBytes,
          updated_at: new Date().toISOString(),
          isDirectory: false,
        }),
        // Add upload progress
        uploadProgress: {
          uploadedBytes: upload.uploadedBytes,
          status: upload.status,
          error: upload.error,
        },
      });
    } else {
      // This is a nested file, show its parent directory
      if (!files.has(immediateChild)) {
        files.set(immediateChild, {
          name: immediateChild,
          path: childPath,
          size: 0,
          updated_at: new Date().toISOString(),
          isDirectory: true,
        });
      }
    }
  }

  return Array.from(files.values());
}
