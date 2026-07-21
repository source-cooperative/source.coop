import { Suspense } from "react";
import { Button } from "@radix-ui/themes";
import { productsTable } from "@/lib/clients";
import { DeleteDataConnectionButton } from "./DeleteDataConnectionButton";

/**
 * Delete control with the dependent-product count loaded behind Suspense, so it
 * stays off the edit form's critical path. The scan is request-deduped with
 * <ConnectionUsage>, so it adds no extra DB work. Shared by the admin and
 * account-scoped connection detail pages.
 */
export function DeleteConnectionControl({
  connectionId,
}: {
  connectionId: string;
}) {
  return (
    <Suspense
      fallback={
        <Button size="2" color="red" variant="soft" disabled>
          Delete
        </Button>
      }
    >
      <DeleteControlInner connectionId={connectionId} />
    </Suspense>
  );
}

async function DeleteControlInner({ connectionId }: { connectionId: string }) {
  const products = await productsTable.listProductsByConnectionId(connectionId);
  return (
    <DeleteDataConnectionButton
      dataConnectionId={connectionId}
      productsInUse={products.length}
    />
  );
}
