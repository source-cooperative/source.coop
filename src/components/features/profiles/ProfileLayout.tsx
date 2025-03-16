import { Text, Box, Link } from '@radix-ui/themes';

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
    <Box>
      <Box mb="4">
        <Text size="5">{description}</Text>
      </Box>
      
      <Box mb="4">
        {fields.map(({ label, value, isLink, href }, index) => (
          <Box key={index} mb={index < fields.length - 1 ? "2" : "0"}>
            <Text>
              {label}: {isLink ? <Link href={href || value}>{value}</Link> : value}
            </Text>
          </Box>
        ))}
      </Box>

      {children}
    </Box>
  );
} 