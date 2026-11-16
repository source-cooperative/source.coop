"use client";

import { DataList, Tooltip } from "@radix-ui/themes";
import { useCatalog } from "@/hooks/useCatalog";
import { useWhen } from "@/hooks/useWhen";

/**
 * The Details card's "Objects Updated" row: when any object in the product was
 * last written, per the metadata catalog, in the viewer's local time with how
 * long ago on hover. The catalog loads client-side, so the row appears once it
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
      {/* balance: at the sidebar's width the date wraps, and this keeps the
          time with its AM/PM instead of leaving it alone on a line. */}
      <DataList.Value style={{ textWrap: "balance" }}>
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
