import { Box } from '@radix-ui/themes';
import type { ComponentProps } from "react";

interface SkeletonProps
  extends Omit<ComponentProps<typeof Box>, "style" | "width" | "height"> {
  height?: string | number;
  width?: string | number;
}

export function Skeleton({
  height = "20px",
  width = "100%",
  ...boxProps
}: SkeletonProps) {
  return (
    <Box
      {...boxProps}
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        width: typeof width === "number" ? `${width}px` : width,
        backgroundColor: "var(--gray-4)",
        borderRadius: "var(--radius-2)",
        animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      }}
    />
  );
}
