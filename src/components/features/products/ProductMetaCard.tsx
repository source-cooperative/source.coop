import { Card } from '@radix-ui/themes';
import type { Product_v2 } from '@/types/product_v2';
import { SectionHeader } from '@/components/core';
import { ProductMetaContent } from './ProductMetaContent';

interface ProductMetaCardProps {
  product: Product_v2;
}

export function ProductMetaCard({ product }: ProductMetaCardProps) {
  return (
    <Card style={{ height: '100%' }} size={{ initial: '2', sm: '1' }}>
      <SectionHeader title="Product Details">
        <ProductMetaContent product={product} />
      </SectionHeader>
    </Card>
  );
} 