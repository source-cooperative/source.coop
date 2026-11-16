"use client";

import { useState } from "react";
import { Button, Dialog, Flex, SegmentedControl, Select, Text } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { Field } from "@/components/core";
import { MembershipRole, type Product } from "@/types";
import type { ProductAccess } from "./ProductAccessList";

/**
 * "Grant a product", for a section's corner: a modal to choose one of the
 * owner's products not yet reached and the access to give it. What a grant
 * does is the caller's, as for `ProductAccessList`.
 */
export function GrantProductDialog({
  ownerAccountId,
  available,
  onGrant,
  disabled,
}: {
  ownerAccountId: string;
  /** The owner's products the account does not reach yet. */
  available: Pick<Product, "product_id" | "title">[];
  onGrant: (product_id: string, access: ProductAccess) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (available.length === 0) return null;
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button type="button" size="1" variant="soft" disabled={disabled}>
          <PlusIcon /> Grant a product
        </Button>
      </Dialog.Trigger>
      <Dialog.Content style={{ maxWidth: 480 }} aria-describedby={undefined}>
        <Dialog.Title>Grant a product</Dialog.Title>
        {/* Unmounts on close, so every open starts with nothing chosen. */}
        <GrantForm
          ownerAccountId={ownerAccountId}
          available={available}
          onGrant={(product_id, access) => {
            onGrant(product_id, access);
            setOpen(false);
          }}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}

function GrantForm({
  ownerAccountId,
  available,
  onGrant,
}: {
  ownerAccountId: string;
  available: Pick<Product, "product_id" | "title">[];
  onGrant: (product_id: string, access: ProductAccess) => void;
}) {
  const [product_id, setProductId] = useState<string>();
  const [access, setAccess] = useState<ProductAccess>(MembershipRole.ReadData);
  return (
    <Flex direction="column" gap="4">
      <Field label="Product" htmlFor="grant-product" required>
        <Select.Root value={product_id} onValueChange={setProductId}>
          {/* The chosen title alone: the options' second line would make the
              closed dropdown two lines tall. Never undefined, even before a
              choice: Radix copies the chosen option into an empty trigger,
              and switching between that and these children breaks the DOM. */}
          <Select.Trigger id="grant-product" placeholder="Choose a product">
            {available.find((p) => p.product_id === product_id)?.title ?? ""}
          </Select.Trigger>
          <Select.Content position="popper">
            {available.map((p) => (
              // Two lines, so the item grows past the one-line height Radix gives
              // it; the path dims the item's own colour rather than taking a
              // grey that would vanish on the highlighted item.
              <Select.Item
                key={p.product_id}
                value={p.product_id}
                style={{ height: "auto", paddingBlock: "var(--space-1)" }}
              >
                <Flex direction="column">
                  <Text size="2">{p.title}</Text>
                  <Text size="1" style={{ fontFamily: "var(--code-font-family)", opacity: 0.7 }}>
                    {ownerAccountId}/{p.product_id}
                  </Text>
                </Flex>
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Field>
      <Field label="Access" htmlFor="grant-access" group>
        {(props) => (
          <SegmentedControl.Root
            aria-labelledby={props["aria-labelledby"]}
            value={access}
            onValueChange={(next) => setAccess(next as ProductAccess)}
          >
            <SegmentedControl.Item value={MembershipRole.ReadData}>Read</SegmentedControl.Item>
            <SegmentedControl.Item value={MembershipRole.WriteData}>Read and write</SegmentedControl.Item>
          </SegmentedControl.Root>
        )}
      </Field>
      <Flex justify="end" gap="2">
        <Dialog.Close>
          <Button type="button" variant="soft" color="gray">
            Cancel
          </Button>
        </Dialog.Close>
        <Button type="button" highContrast disabled={!product_id} onClick={() => product_id && onGrant(product_id, access)}>
          Grant
        </Button>
      </Flex>
    </Flex>
  );
}
