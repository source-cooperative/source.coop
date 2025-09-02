"use client";

import { Box, Text } from "@radix-ui/themes";

interface BannerProps {
  children: React.ReactNode;
}
export function Banner({ children }: BannerProps) {
  return (
    <Box
      style={{
        backgroundColor: "var(--blue-3)",
        padding: "0.5rem 0",
        textAlign: "center",
      }}
    >
      <Text size="2">{children}</Text>
    </Box>
  );
}
