/**
 * Formatting utilities for consistent data display
 */

export function formatSize(bytes: number): string {
  const gb = Math.floor(bytes / (1024 * 1024 * 1024));
  return gb.toLocaleString() + ' GB';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 