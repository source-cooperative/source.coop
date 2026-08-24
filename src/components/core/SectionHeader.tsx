import { Text, Box, Separator, Flex } from "@radix-ui/themes";

interface SectionHeaderProps {
  title: string;
  /** One line on what the section is for, shown under the title. */
  description?: React.ReactNode;
  children?: React.ReactNode;
  rightButton?: React.ReactNode;
}

export function SectionHeader({
  title,
  description,
  children,
  rightButton,
}: SectionHeaderProps) {
  return (
    <Box>
      <Flex justify="between" align="center">
        <Text size="2" weight="bold">
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
        <Separator size="4" color="gray" />
      </Box>
      {children && <Box>{children}</Box>}
    </Box>
  );
}
