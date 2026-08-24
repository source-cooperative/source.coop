import { Suspense } from "react";
import { Button, Flex, Text } from "@radix-ui/themes";
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
          Delete connection
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
    <Flex direction="column" align="end" gap="2">
      <DeleteDataConnectionButton
        dataConnectionId={connectionId}
        productsInUse={products.length}
      />
      {/* The count is resolved here, so the blocker is stated on the disabled
          control rather than waiting to surprise someone inside the dialog. */}
      {products.length > 0 && (
        <Text size="1" color="red" align="right">
          {products.length === 1
            ? "1 product still uses it"
            : `${products.length} products still use it`}
        </Text>
      )}
    </Flex>
  );
}
