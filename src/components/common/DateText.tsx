import { Text } from '@radix-ui/themes';
import { formatDate } from '@/utils/dates';
import type { ComponentProps } from 'react';

interface DateTextProps extends ComponentProps<typeof Text> {
  date: string | Date;
}

export function DateText({ date, ...props }: DateTextProps) {
  return (
    <Text {...props}>
      {formatDate(date)}
    </Text>
  );
} 