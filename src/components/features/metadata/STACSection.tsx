import { Box, Text, Link } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';

interface STACSectionProps {
  stacUrl?: string;
}

export function STACSection({ stacUrl }: STACSectionProps) {
  const t = useTranslations('STACSection');
  if (!stacUrl) return null;

  return (
    <Box>
      <Text as="p" size="2">
        {t.rich('catalog', {
          url: stacUrl,
          link: (chunks) => <Link href={stacUrl}>{chunks}</Link>,
        })}
      </Text>
    </Box>
  );
} 