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
  for (const upload of uploads) {
    // Ignore uploads that are not in the current directory
    if (upload.key.split("/").slice(0, -1).join("/") !== currentPrefix)
      continue;

    const fileName = upload.file.name;
    files.set(fileName, {
      // Get existing file or create a new one
      ...(files.get(fileName) || {
        name: fileName,
        path: upload.key,
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
  }

  return Array.from(files.values());
}
