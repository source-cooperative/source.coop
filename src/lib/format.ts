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
 * Format a date string into a human-readable format that's safe for SSR
 * @param date The date string to format
 * @returns A formatted date string like "5 Feb 2024"
 */
export function formatDateSSR(date: string): string {
  const dateObj = new Date(date);
  const day = dateObj.getUTCDate();
  const month = dateObj.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const year = dateObj.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format a date string into a human-readable format with optional time
 * @param date The date string to format
 * @param includeTime Whether to include the time in the output
 * @returns A formatted date string
 */
export function formatDate(date: string, includeTime: boolean = false): string {
  const dateObj = new Date(date);
  
  if (!includeTime) {
    // Match the SSR format exactly
    return formatDateSSR(date);
  }

  // For timestamps, use Intl.DateTimeFormat but maintain consistent date format
  const day = dateObj.getUTCDate();
  const month = dateObj.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const year = dateObj.getUTCFullYear();
  const time = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
    timeZoneName: 'short'
  }).format(dateObj);

  return `${day} ${month} ${year} ${time}`;
} 