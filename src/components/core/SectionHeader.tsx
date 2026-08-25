import { Text, Box, Separator, Flex } from "@radix-ui/themes";

interface SectionHeaderProps {
  title: string;
  /**
   * Carries the whole header, rule included. A grey rule under a red heading
   * reads as the section having stopped being dangerous halfway down.
   */
  color?: "gray" | "red";
  children?: React.ReactNode;
  rightButton?: React.ReactNode;
}

export function SectionHeader({
  title,
  color = "gray",
  children,
  rightButton,
}: SectionHeaderProps) {
  return (
    // Space above the heading, so consecutive sections read as separate blocks
    // rather than one continuous column of fields.
    <Box mt="4">
      <Flex justify="between" align="center">
        <Text
          size="2"
          weight="bold"
          color={color === "gray" ? undefined : color}
        >
          {title}
        </Text>
        {rightButton}
      </Flex>
      <Box my="3">
        <Separator size="4" color={color} />
      </Box>
      {children && <Box>{children}</Box>}
    </Box>
  );
}
