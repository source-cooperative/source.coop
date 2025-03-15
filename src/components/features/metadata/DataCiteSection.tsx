import { Box, Text, Link } from '@radix-ui/themes';

interface DataCiteSectionProps {
  doi?: string;
}

export function DataCiteSection({ doi }: DataCiteSectionProps) {
  if (!doi) return null;

  return (
    <Box>
      <Text as="p" size="2">
        DOI: <Link href={`https://doi.org/${doi}`}>{doi}</Link>
      </Text>
    </Box>
  );
} 