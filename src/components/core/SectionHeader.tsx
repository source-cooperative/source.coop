import { Text, Box, Separator, Flex } from "@radix-ui/themes";

interface SectionHeaderProps {
  title: string;
  children?: React.ReactNode;
  rightButton?: React.ReactNode;
}

export function SectionHeader({
  title,
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
      <Box my="3">
        <Separator size="4" color="gray" />
      </Box>
      {children && <Box>{children}</Box>}
    </Box>
  );
}
