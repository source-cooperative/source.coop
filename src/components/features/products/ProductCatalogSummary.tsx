"use client";

import { Box } from "@radix-ui/themes";
import { useCatalog } from "@/hooks/useCatalog";
import { ProductCatalogStats } from "./ProductCatalogStats";

export function ProductCatalogSummary({
  accountId,
  productId,
}: {
  accountId: string;
  productId: string;
}) {
  const catalog = useCatalog(true);
  const entry = catalog?.get(`${accountId}/${productId}`);
  if (!entry) return null;

  return (
    <Box px={{ initial: "4", md: "0" }}>
      <ProductCatalogStats entry={entry} />
    </Box>
  );
}
