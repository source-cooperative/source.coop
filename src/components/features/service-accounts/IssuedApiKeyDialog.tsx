"use client";

import { useState } from "react";
import { Button, Dialog, Flex } from "@radix-ui/themes";
import type { ServiceAccountKey } from "@/types";
import { IssuedApiKey } from "./IssuedApiKey";

type Issued = { key: string; record: ServiceAccountKey };

// The key travels from the create form to the account's page in this
// module's memory: never in the URL, a cookie or storage. A client-side
// navigation keeps it; a reload drops it, the same as any key's one showing.
let pending: Issued | null = null;

/** Holds a just-issued key for the account's page to show once it opens. */
export const handOffIssuedKey = (issued: Issued) => {
  pending = issued;
};

/**
 * The key issued with a service account, shown over the account's page the
 * one time it can be seen. Renders nothing unless the create form handed one
 * off for this account; closing it lets the key go.
 */
export function IssuedApiKeyDialog({ accountId }: { accountId: string }) {
  const [issued] = useState(() => (pending?.record.account_id === accountId ? pending : null));
  const [open, setOpen] = useState(issued !== null);
  if (!issued) return null;
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) pending = null;
      }}
    >
      <Dialog.Content style={{ maxWidth: 640 }} aria-describedby={undefined}>
        <Dialog.Title>API key issued</Dialog.Title>
        <IssuedApiKey apiKey={issued.key} record={issued.record} />
        <Flex justify="end" mt="4">
          <Dialog.Close>
            <Button variant="soft">Done</Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
