"use client";

import Link from "next/link";
import { Flex, SegmentedControl, Text } from "@radix-ui/themes";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import {
  ConnectionList,
  ConnectionRow,
} from "@/components/features/data-connections/ConnectionRow";
import { productUrl } from "@/lib/urls";
import { MembershipRole, type Product } from "@/types";

/** The control's value for a product the account does not reach. */
export const NO_ACCESS = "none";
export type ProductAccess = MembershipRole.ReadData | MembershipRole.WriteData;

/**
 * Every product an owner has, each with how much of it a service account may
 * reach: none, read, or read and write. Each title opens the product in a new
 * tab, to check what it holds. What a change does is the caller's: the create
 * form holds it until submit, the account's page saves it at once.
 */
export function ProductAccessList({
  ownerAccountId,
  products,
  access,
  onChange,
  disabled,
}: {
  ownerAccountId: string;
  products: Pick<Product, "product_id" | "title">[];
  /** Access per product id; a product missing here has none. */
  access: Record<string, ProductAccess>;
  onChange: (product_id: string, access: ProductAccess | null) => void;
  disabled?: boolean;
}) {
  if (products.length === 0) {
    return (
      <Text size="2" color="gray">
        {ownerAccountId} has no products yet.
      </Text>
    );
  }
  return (
    <ConnectionList>
      {products.map(({ product_id, title }) => (
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
            <SegmentedControl.Root
              size="1"
              aria-label={`Access to ${product_id}`}
              value={access[product_id] ?? NO_ACCESS}
              disabled={disabled}
              onValueChange={(next) =>
                onChange(product_id, next === NO_ACCESS ? null : (next as ProductAccess))
              }
            >
              <SegmentedControl.Item value={NO_ACCESS}>None</SegmentedControl.Item>
              <SegmentedControl.Item value={MembershipRole.ReadData}>Read</SegmentedControl.Item>
              <SegmentedControl.Item value={MembershipRole.WriteData}>Read and write</SegmentedControl.Item>
            </SegmentedControl.Root>
          }
        />
      ))}
    </ConnectionList>
  );
}
