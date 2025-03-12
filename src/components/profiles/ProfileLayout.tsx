import { Text, Flex, Link } from '@radix-ui/themes';

interface ProfileField {
  label: string;
  value: string;
  isLink?: boolean;
  href?: string;
}

interface ProfileLayoutProps {
  description: string;
  fields: ProfileField[];
  children?: React.ReactNode;
}

export function ProfileLayout({ description, fields, children }: ProfileLayoutProps) {
  return (
    <Flex direction="column" gap="4">
      <Text size="5">{description}</Text>
      
      <Flex direction="column" gap="2">
        {fields.map(({ label, value, isLink, href }, index) => (
          <Text key={index}>
            {label}: {isLink ? <Link href={href || value}>{value}</Link> : value}
          </Text>
        ))}
      </Flex>

      {children}
    </Flex>
  );
} 