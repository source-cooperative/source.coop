"use client";

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
  return (
    <ProductCatalogStats
      entry={catalog?.get(`${accountId}/${productId}`)}
      px={{ initial: "4", md: "0" }}
    />
  );
}
