import { Card, Flex, Text, Link as RadixLink } from '@radix-ui/themes';
import Link from 'next/link';

interface LinkCardProps {
  href: string;
  title: string;
  children: React.ReactNode;
}

export function LinkCard({ href, title, children }: LinkCardProps) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <Card>
        <Flex direction="column" gap="2">
          <Text size="5" weight="bold">{title}</Text>
          {children}
        </Flex>
      </Card>
    </Link>
  );
} 