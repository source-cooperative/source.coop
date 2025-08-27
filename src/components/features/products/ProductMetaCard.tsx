import { Card } from '@radix-ui/themes';
import type { Product } from "@/types";
import { SectionHeader } from '@/components/core';
import { ProductMetaContent } from './ProductMetaContent';

interface ProductMetaCardProps {
  product: Product;
}

export function ProductMetaCard({ product }: ProductMetaCardProps) {
  return (
    <Card style={{ height: '100%', background: 'var(--gray-1)' }} size={{ initial: '2', sm: '1' }}>
      <SectionHeader title="Product Details">
        <ProductMetaContent product={product} />
      </SectionHeader>
    </Card>
  );
} 