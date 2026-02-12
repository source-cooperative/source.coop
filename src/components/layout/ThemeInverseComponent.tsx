"use client";

import { Box, Theme } from "@radix-ui/themes";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export function ThemeInverseComponent({
  children,
  ...props
}: { children: React.ReactNode } & React.ComponentProps<typeof Box>) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const inverseAppearance = !mounted
    ? "light"
    : resolvedTheme === "light"
      ? "dark"
      : "light";

  return (
    <Theme appearance={inverseAppearance}>
      <Box {...props}>{children}</Box>
    </Theme>
  );
}
