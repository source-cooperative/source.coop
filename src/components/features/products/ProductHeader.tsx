// For product detail page header
import { Suspense } from "react";
import { Grid, Box, Flex } from "@radix-ui/themes";
import type { Product } from "@/types";
import { ProductSummaryCard } from "./ProductSummaryCard";
import { ProductMetaCard } from "./ProductMetaCard";
import { UsageCard } from "@/components/features/analytics";

interface ProductHeaderProps {
  product: Product;
}

export function ProductHeader({ product }: ProductHeaderProps) {
  return (
    <Grid
      columns={{ initial: "1", md: "3" }}
      gap={{ initial: "0", md: "6" }}
      px={{ initial: "0" }}
    >
      <Box
        width="100%"
        className="product-summary"
        style={{ gridColumn: "span 2" }}
        px={{ initial: "4", md: "0" }}
        mb={{ initial: "4", md: "0" }}
      >
        <Box mb="4">
          <ProductSummaryCard product={product} />
        </Box>
      </Box>
      <Flex width="100%" className="product-meta" direction="column" gap="4">
        {/* flexGrow (not the card's height:100%) absorbs the grid-stretched
            row height, so the usage card below keeps its natural size */}
        <Box flexGrow="1">
          <ProductMetaCard product={product} />
        </Box>
        {/* Streams in after the page shell; hidden when analytics is off */}
        <Suspense fallback={null}>
          <UsageCard
            accountId={product.account_id}
            productId={product.product_id}
          />
        </Suspense>
      </Flex>
    </Grid>
  );
}
