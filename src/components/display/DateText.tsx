"use client";

import { useEffect, useState } from 'react';
import { DateContent } from './DateContent';

interface DateTextProps {
  date: string;
  includeTime?: boolean;
}

export function DateText({ date, includeTime }: DateTextProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <DateContent date={date} includeTime={includeTime} />;
} 