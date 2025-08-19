import { Box } from '@radix-ui/themes';

interface SkeletonProps {
  height?: string | number;
  width?: string | number;
  className?: string;
}

export function Skeleton({ height = '20px', width = '100%', className }: SkeletonProps) {
  return (
    <Box
      className={className}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width,
        backgroundColor: 'var(--gray-4)',
        borderRadius: 'var(--radius-2)',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}
    />
  );
}
