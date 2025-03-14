import { Text, Box, Flex } from '@radix-ui/themes';

interface SectionHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function SectionHeader({ title, children }: SectionHeaderProps) {
  return (
    <Flex direction="column" gap="3">
      <Text size="2" weight="bold">
        {title}
      </Text>
      <Box 
        style={{ 
          height: '1px', 
          background: 'var(--gray-5)', 
          width: '100%',
        }} 
      />
      {children}
    </Flex>
  );
} 