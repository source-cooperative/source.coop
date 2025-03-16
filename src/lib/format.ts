/**
 * Format a number of bytes into a human-readable string
 * @param bytes The number of bytes to format
 * @returns A formatted string with appropriate units
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format a date string into a human-readable format
 * @param date The date string to format
 * @param includeTime Whether to include the time in the output
 * @returns A formatted date string
 */
export function formatDate(date: string, includeTime: boolean = false): string {
  const dateObj = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(includeTime ? {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    } : {})
  };
  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
} 