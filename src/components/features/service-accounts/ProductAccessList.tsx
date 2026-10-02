"use client";

import Link from "next/link";
import { Flex, IconButton, SegmentedControl, Text, Tooltip } from "@radix-ui/themes";
import { Cross2Icon, ExternalLinkIcon } from "@radix-ui/react-icons";
import {
  RowList,
  ListRow,
} from "@/components/core/ListRow";
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

/**
 * The products of an owner a service account reaches, each with Read or Read
 * and write and an X to remove it. Each title opens the product in a new tab,
 * to check what it holds. Granting another is `GrantProductDialog`, in the
 * section's corner.
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
  const reached = products.filter((p) => access[p.product_id]);

  if (products.length === 0) {
    return (
      <Text size="2" color="gray">
        {ownerAccountId} has no products yet.
      </Text>
    );
  }
  return (
    <>
      {reached.length === 0 ? (
        <Text size="2" color="gray">
          Nothing yet. Grant a product to let it read or write data.
        </Text>
      ) : (
        <RowList>
          {reached.map(({ product_id, title }) => (
            <ListRow
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
        </RowList>
      )}
    </>
  );
}
