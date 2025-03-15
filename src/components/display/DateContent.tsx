import { formatDate } from '@/lib';

interface DateContentProps {
  date: string;
  includeTime?: boolean;
}

export function DateContent({ date, includeTime = false }: DateContentProps) {
  return formatDate(date, includeTime);
} 