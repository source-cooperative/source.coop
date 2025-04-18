import { Heading, Text, Box } from '@radix-ui/themes';
import type { Product_v2 } from '@/types/product_v2';

interface ProductSummaryCardProps {
  product: Product_v2;
}

export function ProductSummaryCard({ product }: ProductSummaryCardProps) {
  return (
    <Box>
      <Heading size="8" mb="2">{product.title}</Heading>
      {product.description && (
        <Text color="gray" size="4" mb="4">{product.description}</Text>
      )}
    </Box>
  );
} 