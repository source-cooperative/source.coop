"use client";

import { useState } from "react";
import { Text, Box, Separator, Flex, IconButton } from "@radix-ui/themes";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";

interface SectionHeaderProps {
  title: string;
  children?: React.ReactNode;
  rightButton?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function SectionHeader({
  title,
  children,
  rightButton,
  collapsible = false,
  defaultCollapsed = false,
}: SectionHeaderProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <Box>
      <Flex justify="between" align="center">
        <Flex align="center" gap="2">
          <Text size="2" weight="bold">
            {title}
          </Text>
          {collapsible && (
            <IconButton
              size="1"
              variant="ghost"
              color="gray"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
            </IconButton>
          )}
        </Flex>
        {rightButton}
      </Flex>
      {!collapsed && (
        <>
          <Box my="3">
            <Separator size="4" color="gray" />
          </Box>
          {children && <Box>{children}</Box>}
        </>
      )}
    </Box>
  );
}
