import { Card } from '@radix-ui/themes';
import type { Product } from "@/types";
import { SectionHeader } from '@/components/core';
import { ProductMetaContent } from './ProductMetaContent';
import { useTranslations } from 'next-intl';

interface ProductMetaCardProps {
  product: Product;
}

export function ProductMetaCard({ product }: ProductMetaCardProps) {
  const t = useTranslations('ProductMetaCard');
  return (
    <Card size={{ initial: '2', sm: '1' }}>
      <SectionHeader title={t('details')}>
        <ProductMetaContent product={product} />
      </SectionHeader>
    </Card>
  );
} 