import { ReactNode } from "react";
import { Box, Flex } from "@radix-ui/themes";

interface SettingsHeaderProps {
  children: ReactNode;
}

export function SettingsHeader({ children }: SettingsHeaderProps) {
  return (
    <Box
      style={{
        borderBottom: "1px solid var(--gray-6)",
        paddingBottom: "16px",
        marginBottom: "24px",
      }}
    >
      <Flex justify="between" align="center">
        {children}
      </Flex>
    </Box>
  );
}
