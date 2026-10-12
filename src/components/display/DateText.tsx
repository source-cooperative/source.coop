'use client';

import { useFormatter } from 'next-intl';

interface DateTextProps {
  date: string;
  includeTime?: boolean;
}

export function DateText({ date, includeTime = false }: DateTextProps) {
  const format = useFormatter();
  return (
    <span>
      {format.dateTime(new Date(date), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...(includeTime && {
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
          timeZoneName: 'short',
        }),
      })}
    </span>
  );
}
