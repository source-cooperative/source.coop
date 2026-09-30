/**
 * Format a number of bytes into a human-readable string
 * @param bytes The number of bytes to format
 * @param decimals Maximum decimal places (default 2)
 * @returns A formatted string with appropriate units
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
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

const ELLIPSIS = "…";

/**
 * Shorten a URL to something readable in a narrow column: the scheme and a
 * leading "www." go, and the middle is elided so the host and the end of the
 * path both survive. A plain tail-cut ("github.com/source-coop…") would make
 * two links to the same site indistinguishable.
 *
 * The budget is characters, not measured width, so it is a guess at the column.
 * Pair it with CSS truncation as a backstop and the full URL on a title.
 *
 * @param url The URL to shorten, with or without a scheme
 * @param maxLength Maximum characters in the result (default 32)
 * @returns A display string, never longer than maxLength
 */
export function formatUrl(url: string, maxLength: number = 32): string {
  const display = url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");

  if (display.length <= maxLength) return display;

  const slash = display.indexOf("/");
  const host = slash === -1 ? display : display.slice(0, slash);
  const path = slash === -1 ? "" : display.slice(slash);

  // A host that busts the budget on its own has no middle worth keeping.
  if (!path || host.length + 2 > maxLength) {
    return display.slice(0, maxLength - 1) + ELLIPSIS;
  }

  const budget = maxLength - host.length - 2; // pay for the host and "/…"

  // ponytail: longest tail starting at a "/", so it reads as whole segments.
  // A width-measuring version would fit better; only worth it if this misfits.
  for (let i = 0; i < path.length; i++) {
    if (path[i] === "/" && path.length - i <= budget) {
      return host + "/" + ELLIPSIS + path.slice(i);
    }
  }

  // One very long segment: cut inside it, dropping leading punctuation.
  const tail = path.slice(path.length - budget).replace(/^[^\p{L}\p{N}]+/u, "");
  return host + "/" + ELLIPSIS + tail;
}
