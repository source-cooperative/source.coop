import { Heading, Text, Box } from "@radix-ui/themes";
import type { Product } from "@/types";
import { TagList } from "./TagList";

interface ProductSummaryCardProps {
  product: Product;
}

export function ProductSummaryCard({ product }: ProductSummaryCardProps) {
  return (
    <Box>
      <Heading size="8" mb="2">
        {product.title}
      </Heading>
      {product.description && (
        <Text color="gray" size="4" mb="4">
          {product.description}
        </Text>
      )}
      {product.metadata.tags && product.metadata.tags.length > 0 && (
        <TagList tags={product.metadata.tags} />
      )}
    </Box>
  );
}
