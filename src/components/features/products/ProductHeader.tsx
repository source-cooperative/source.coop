// For product detail page header
import { Grid, Box } from '@radix-ui/themes';
import type { Product } from "@/types";
import { ProductSummaryCard } from './ProductSummaryCard';
import { ProductMetaCard } from './ProductMetaCard';

interface ProductHeaderProps {
  product: Product;
}

export function ProductHeader({ product }: ProductHeaderProps) {
  return (
    <Grid 
      columns={{ initial: '1', md: '3' }} 
      gap={{ initial: '0', md: '6' }}
      px={{ initial: '0' }}
    >
      <Box 
        width="100%" 
        className="product-summary" 
        style={{ gridColumn: 'span 2' }}
        px={{ initial: '4', md: '0' }}
        mb={{ initial: '4', md: '0' }}
      >
        <Box mb="4">
          <ProductSummaryCard product={product} />
        </Box>
      </Box>
      <Box width="100%" className="product-meta">
        <ProductMetaCard product={product} />
      </Box>
    </Grid>
  );
} 