export function formatSize(bytes: number): string {
  const gb = Math.floor(bytes / (1024 * 1024 * 1024));
  return gb.toLocaleString() + ' GB';
} 