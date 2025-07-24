import { Heading, Text, Box } from '@radix-ui/themes';
import type { Product } from "@/types";

interface ProductSummaryCardProps {
  product: Product;
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