"use client";

import { DataList } from "@radix-ui/themes";
import { useCatalog } from "@/hooks/useCatalog";
import { formatDate, formatRelative } from "@/lib/format";

/**
 * The Details card's "Objects Updated" row: when any object in the product was
 * last written, per the metadata catalog. The catalog loads client-side, so the
 * row appears once it has, and never when it has no date for the product.
 */
export function ProductObjectsUpdated({
  accountId,
  productId,
}: {
  accountId: string;
  productId: string;
}) {
  const updated = useCatalog(true)?.get(`${accountId}/${productId}`)?.objects_updated_at;
  if (!updated) return null;
  return (
    <DataList.Item>
      <DataList.Label>Objects Updated</DataList.Label>
      <DataList.Value>
        <span title={formatDate(updated, true)}>{formatRelative(updated)}</span>
      </DataList.Value>
    </DataList.Item>
  );
}
