import type { ProductObject } from '@/types';

export interface FileNode {
  name: string;
  path: string;
  size: number;
  updated_at: string;
  isDirectory: boolean;
  object?: ProductObject;
}

/**
 * Detect if a path represents a directory by:
 * 1. Checking if it has an explicit directory type
 * 2. Checking if any objects exist under this path
 * This handles cases like:
 * - /climate.zarr/ (directory with file-like name)
 * - /path.with.dots/nested/files (paths with dots)
 * - /path/with/trailing/slash/ (normalize slashes)
 */
export function isDirectory(objects: ProductObject[], path: string): boolean {
  // Normalize path to not end with slash for comparison
  const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
  
  // First check if we have an explicit directory type
  const exactMatch = objects.find(obj => {
    const objPath = obj.path.endsWith('/') ? obj.path.slice(0, -1) : obj.path;
    return objPath === normalizedPath;
  });
  if (exactMatch?.type === 'directory') return true;
  
  // Then check if any objects exist under this path
  const prefix = normalizedPath + '/';
  return objects.some(obj => obj.path.startsWith(prefix));
}

export function buildDirectoryTree(objects: ProductObject[], currentPath: string[] = []) {
  const root: { [key: string]: FileNode } = {};
  const prefix = currentPath.length > 0 ? currentPath.join('/') + '/' : '';
  
  // Filter objects for current directory level only
  objects.forEach(obj => {
    // Skip if doesn't match prefix
    if (prefix && !obj.path.startsWith(prefix)) return;
    
    // Get relative path from current directory
    const relativePath = obj.path.slice(prefix.length);
    if (!relativePath) return;
    
    // Get path parts
    const parts = relativePath.split('/');
    if (!parts[0]) return;
    
    // If we have more than one part, this is a nested path
    // We only want to show direct children of the current directory
    if (parts.length > 1) {
      const nodeName = parts[0];
      if (!root[nodeName]) {
        root[nodeName] = {
          name: nodeName,
          path: prefix + nodeName,
          size: 0,
          updated_at: new Date().toISOString(),
          isDirectory: true
        };
      }
      return;
    }
    
    // This is a direct child of the current directory
    const nodeName = parts[0];
    // Only add if we haven't seen this name before or if it's a file (files take precedence)
    if (!root[nodeName] || !root[nodeName].isDirectory) {
      root[nodeName] = {
        name: nodeName,
        path: obj.path,
        size: obj.size,
        updated_at: obj.updated_at,
        isDirectory: obj.type === 'directory',
        object: obj
      };
    }
  });

  return root;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getContainerHeight(itemCount: number, itemHeight: number, maxItems: number) {
  return Math.min(
    Math.max(itemCount * itemHeight, itemHeight), 
    maxItems * itemHeight
  );
} 