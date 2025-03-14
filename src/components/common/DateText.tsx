"use client";

import { Text } from '@radix-ui/themes';
import { formatDate, type DateFormatOptions } from '@/utils/dates';
import { useEffect, useState } from 'react';

interface DateTextProps {
  date: string | Date;
  includeTime?: boolean;
}

export function DateText({ date, includeTime }: DateTextProps) {
  // Start with null to avoid hydration mismatch
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    // Format date only on client-side
    setFormattedDate(formatDate(date, { includeTime }));
  }, [date, includeTime]);

  // Return null or loading state until client-side render
  if (!formattedDate) {
    return <Text>-</Text>;
  }

  return <Text>{formattedDate}</Text>;
} 