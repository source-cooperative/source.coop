'use client';

import { useWhen } from '@/hooks/useWhen';

export function DateText({ date }: { date: string }) {
  return <span>{useWhen(date).text}</span>;
}
