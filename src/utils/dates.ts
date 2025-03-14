export interface DateFormatOptions {
  includeTime?: boolean;
}

export function formatDate(date: string | Date, options: DateFormatOptions = { includeTime: false }): string {
  const d = new Date(date);
  
  const baseOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  } as const;

  if (options.includeTime) {
    return d.toLocaleDateString('en-GB', {
      ...baseOptions,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  }

  return d.toLocaleDateString('en-GB', baseOptions);
} 