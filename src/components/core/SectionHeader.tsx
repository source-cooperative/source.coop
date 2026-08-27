import { Text, Box, Separator, Flex } from "@radix-ui/themes";

interface SectionHeaderProps {
  title: string;
  /** One line on what the section is for, shown under the title. */
  description?: React.ReactNode;
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
  description,
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
      {description && (
        <Text as="p" size="1" color="gray" mt="1">
          {description}
        </Text>
      )}
      <Box my="3">
        <Separator size="4" color={color} />
      </Box>
      {children && <Box>{children}</Box>}
    </Box>
  );
}
