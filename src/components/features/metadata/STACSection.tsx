import { Box, Text, Link } from '@radix-ui/themes';

interface STACSectionProps {
  stacUrl?: string;
}

export function STACSection({ stacUrl }: STACSectionProps) {
  if (!stacUrl) return null;

  return (
    <Box>
      <Text as="p" size="2">
        STAC Catalog: <Link href={stacUrl}>{stacUrl}</Link>
      </Text>
    </Box>
  );
} 