import { Suspense } from "react";
import { Button, Flex, Text } from "@radix-ui/themes";
import { LockClosedIcon } from "@radix-ui/react-icons";
import { productsTable } from "@/lib/clients";
import { DeleteDataConnectionButton } from "./DeleteDataConnectionButton";

/**
 * Delete control with the dependent-product count loaded behind Suspense, so it
 * stays off the edit form's critical path. Shared by the admin and
 * account-scoped connection detail pages.
 *
 * Three components on this page ask the same question -- this,
 * <DeleteConnectionNote> and <ConnectionUsage> -- and the answer is a full
 * table scan. They cost one query between them, not three:
 * `listProductsByConnectionId` pages through `BaseTable.cachedSend`, which
 * routes reads through the request-scoped memoizer in
 * `database/request-cache.ts`. That layer exists precisely because the AWS SDK
 * does not use `fetch()`, so Next's own per-request dedup would not cover it.
 * Pinned by "shares one scan across every caller in a request" in
 * `products.test.ts`, which sees three scans if the memoizer is bypassed.
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
    <DeleteDataConnectionButton
      dataConnectionId={connectionId}
      productsInUse={products.length}
    />
  );
}

/**
 * Why the connection cannot be deleted, for the danger zone's note slot.
 *
 * Separate from the button so it sits under the explanation rather than beside
 * the control — it is a reason, not an action. The count is resolved before
 * either renders, which is the point: the blocker is stated up front instead of
 * waiting to surprise someone inside the confirmation dialog.
 */
export function DeleteConnectionNote({
  connectionId,
}: {
  connectionId: string;
}) {
  return (
    <Suspense fallback={null}>
      <DeleteNoteInner connectionId={connectionId} />
    </Suspense>
  );
}

async function DeleteNoteInner({ connectionId }: { connectionId: string }) {
  const products = await productsTable.listProductsByConnectionId(connectionId);
  if (products.length === 0) return null;

  return (
    <Flex align="center" gap="1">
      <LockClosedIcon width="14" height="14" color="var(--red-11)" />
      <Text size="1" color="red">
        Blocked:{" "}
        {products.length === 1
          ? "1 product still uses it"
          : `${products.length} products still use it`}
        . Remove it from each first.
      </Text>
    </Flex>
  );
}
