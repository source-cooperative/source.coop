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

/**
 * Keep only the optimistically-deleted paths that are still present in the
 * latest listing. Prunes a deleted path once the server agrees it's gone, so a
 * stale (eventually-consistent) listing never resurrects a deleted item and a
 * re-created path is never wrongly hidden.
 */
export const retainPresent = (
  deleted: Set<string>,
  presentPaths: Iterable<string>
): Set<string> => {
  const present = new Set(presentPaths);
  return new Set([...deleted].filter((p) => present.has(p)));
};

export const asFileNodes = (objects: ProductObject[]): FileNode[] =>
  objects.map((obj) => ({
    name: obj.path.replace(/\/+$/, "").split("/").pop()!, // Get last segment of path
    path: obj.path,
    size: obj.size,
    updated_at: obj.updated_at,
    isDirectory: obj.type === "directory",
    object: obj,
  }));

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
    // Check if upload is under the current prefix
    if (!upload.key.startsWith(normalizedPrefix)) continue;

    // Get the relative path from the current prefix
    const prefixLength = normalizedPrefix ? normalizedPrefix.length + 1 : 0;
    const relativePath = upload.key.slice(prefixLength);

    // Split into segments to find what should be shown in this directory
    const segments = relativePath.split("/").filter(Boolean);
    if (segments.length === 0) continue;

    const name = segments[0];
    const isFile = segments.length === 1;

    if (isFile) {
      // File directly in current directory - show with upload progress
      files.set(name, {
        ...(files.get(name) || {
          name,
          path: upload.key,
          size: upload.totalBytes,
          updated_at: new Date().toISOString(),
          isDirectory: false,
        }),
        uploadProgress: {
          uploadedBytes: upload.uploadedBytes,
          status: upload.status,
          error: upload.error,
        },
      });
    } else if (!files.has(name)) {
      // Nested file - show parent directory
      const dirPath = normalizedPrefix ? `${normalizedPrefix}/${name}/` : `${name}/`;
      files.set(name, {
        name,
        path: dirPath,
        size: 0,
        updated_at: new Date().toISOString(),
        isDirectory: true,
      });
    }
  }

  return Array.from(files.values());
}
