"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Button,
  Flex,
  IconButton,
  SegmentedControl,
  Select,
  Text,
  Tooltip,
} from "@radix-ui/themes";
import { Cross2Icon, ExternalLinkIcon, PlusIcon } from "@radix-ui/react-icons";
import {
  ConnectionList,
  ConnectionRow,
} from "@/components/features/data-connections/ConnectionRow";
import { productUrl } from "@/lib/urls";
import { MembershipRole, type Product } from "@/types";

export type ProductAccess = MembershipRole.ReadData | MembershipRole.WriteData;

function AccessControl({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: ProductAccess;
  onChange: (next: ProductAccess) => void;
  disabled?: boolean;
}) {
  return (
    <SegmentedControl.Root
      size="1"
      aria-label={label}
      value={value}
      disabled={disabled}
      onValueChange={(next) => onChange(next as ProductAccess)}
    >
      <SegmentedControl.Item value={MembershipRole.ReadData}>Read</SegmentedControl.Item>
      <SegmentedControl.Item value={MembershipRole.WriteData}>Read and write</SegmentedControl.Item>
    </SegmentedControl.Root>
  );
}

/** The row "Grant a product" opens: which product, how much, and Grant. */
function GrantRow({
  available,
  onGrant,
  onCancel,
  disabled,
}: {
  available: Pick<Product, "product_id" | "title">[];
  onGrant: (product_id: string, access: ProductAccess) => void;
  onCancel: () => void;
  disabled?: boolean;
}) {
  const [product_id, setProductId] = useState<string>();
  const [access, setAccess] = useState<ProductAccess>(MembershipRole.ReadData);
  return (
    <ConnectionRow
      title={
        <Select.Root value={product_id} onValueChange={setProductId}>
          <Select.Trigger placeholder="Choose a product" aria-label="Product to grant" />
          <Select.Content position="popper">
            {available.map((p) => (
              <Select.Item key={p.product_id} value={p.product_id}>
                {p.title}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      }
      actions={
        <Flex align="center" gap="3">
          <AccessControl label="Access to grant" value={access} onChange={setAccess} />
          {/* highContrast, as FormActions' submit is: a solid button in this
              theme's grey accent fails contrast for its label. */}
          <Button
            type="button"
            size="1"
            highContrast
            disabled={!product_id || disabled}
            onClick={() => product_id && onGrant(product_id, access)}
          >
            Grant
          </Button>
          <Tooltip content="Cancel">
            <IconButton
              type="button"
              size="1"
              variant="ghost"
              color="gray"
              aria-label="Cancel granting a product"
              onClick={onCancel}
            >
              <Cross2Icon />
            </IconButton>
          </Tooltip>
        </Flex>
      }
    />
  );
}

/**
 * The products of an owner a service account reaches, each with Read or Read
 * and write and an X to remove it, and "Grant a product" to add another: a row
 * with the owner's other products, the access to give, and Grant. Each title
 * opens the product in a new tab, to check what it holds.
 *
 * What a change does is the caller's. The create form holds them until it is
 * submitted; the account's page saves each as it is made.
 */
export function ProductAccessList({
  ownerAccountId,
  products,
  access,
  onChange,
  disabled,
}: {
  ownerAccountId: string;
  /** Every product the owner has; those in `access` are listed. */
  products: Pick<Product, "product_id" | "title">[];
  access: Record<string, ProductAccess>;
  /** A grant made or changed, or removed (`null`). */
  onChange: (product_id: string, access: ProductAccess | null) => void;
  disabled?: boolean;
}) {
  const [granting, setGranting] = useState(false);
  const reached = products.filter((p) => access[p.product_id]);
  const available = products.filter((p) => !access[p.product_id]);

  if (products.length === 0) {
    return (
      <Text size="2" color="gray">
        {ownerAccountId} has no products yet.
      </Text>
    );
  }
  return (
    <Flex direction="column" gap="3">
      {reached.length === 0 && !granting ? (
        <Text size="2" color="gray">
          Nothing yet. Grant a product to let it read or write data.
        </Text>
      ) : (
        <ConnectionList>
          {reached.map(({ product_id, title }) => (
            <ConnectionRow
              key={product_id}
              title={
                <Link
                  href={productUrl(ownerAccountId, product_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent-11)", textDecoration: "none" }}
                >
                  <Flex align="center" gap="1">
                    <Text size="2" weight="medium">
                      {title}
                    </Text>
                    <ExternalLinkIcon width="12" height="12" aria-label="opens in a new tab" />
                  </Flex>
                </Link>
              }
              meta={`${ownerAccountId}/${product_id}`}
              actions={
                <Flex align="center" gap="3">
                  <AccessControl
                    label={`Access to ${product_id}`}
                    value={access[product_id]}
                    onChange={(next) => onChange(product_id, next)}
                    disabled={disabled}
                  />
                  <Tooltip content="Remove">
                    <IconButton
                      type="button"
                      size="1"
                      variant="ghost"
                      color="red"
                      disabled={disabled}
                      aria-label={`Remove access to ${product_id}`}
                      onClick={() => onChange(product_id, null)}
                    >
                      <Cross2Icon />
                    </IconButton>
                  </Tooltip>
                </Flex>
              }
            />
          ))}
          {granting && (
            <GrantRow
              available={available}
              disabled={disabled}
              onCancel={() => setGranting(false)}
              onGrant={(product_id, next) => {
                setGranting(false);
                onChange(product_id, next);
              }}
            />
          )}
        </ConnectionList>
      )}
      {!granting && available.length > 0 && (
        <Flex>
          <Button type="button" variant="soft" onClick={() => setGranting(true)}>
            <PlusIcon /> Grant a product
          </Button>
        </Flex>
      )}
    </Flex>
  );
}
