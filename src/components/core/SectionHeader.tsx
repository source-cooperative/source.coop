import { Text, Box, Separator } from '@radix-ui/themes';

interface SectionHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function SectionHeader({ title, children }: SectionHeaderProps) {
  return (
    <Box>
      <Text size="2" weight="bold">
        {title}
      </Text>
      <Box my="3">
        <Separator size="4" color="gray" />
      </Box>
      {children && <Box>{children}</Box>}
    </Box>
  );
} 