'use client';

import { useState, useEffect } from 'react';
import { formatDate, formatDateSSR } from '@/lib';

interface DateTextProps {
  date: string;
  includeTime?: boolean;
}

export function DateText({ date, includeTime = false }: DateTextProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use SSR-safe format for initial render to avoid jitter
  if (!mounted) {
    return <span>{formatDateSSR(date)}</span>;
  }

  return <span>{formatDate(date, includeTime)}</span>;
} 