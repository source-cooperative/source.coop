import { formatDate } from '@/lib';

interface DateTextProps {
  date: string;
  includeTime?: boolean;
}

export function DateText({ date, includeTime = false }: DateTextProps) {
  return formatDate(date, includeTime);
} 