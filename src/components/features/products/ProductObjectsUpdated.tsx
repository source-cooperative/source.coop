"use client";

import { DataList, Tooltip } from "@radix-ui/themes";
import { useCatalog } from "@/hooks/useCatalog";
import { useWhen } from "@/hooks/useWhen";

/**
 * The Details card's "Objects Updated" row: when any object in the product was
 * last written, per the metadata catalog, as the viewer's local date, with the
 * full time and how long ago on hover. The catalog loads client-side, so the row appears once it
 * has, and never when it has no date for the product.
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
        <When iso={updated} />
      </DataList.Value>
    </DataList.Item>
  );
}

function When({ iso }: { iso: string }) {
  const { text, hover } = useWhen(iso);
  return (
    <Tooltip content={hover}>
      <span title={hover}>{text}</span>
    </Tooltip>
  );
}
