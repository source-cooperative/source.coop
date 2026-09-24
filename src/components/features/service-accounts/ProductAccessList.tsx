"use client";

import Link from "next/link";
import { Flex, IconButton, SegmentedControl, Text, Tooltip } from "@radix-ui/themes";
import { Cross2Icon, ExternalLinkIcon } from "@radix-ui/react-icons";
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
 * Products of an owner, each with how much of it a service account may reach.
 * Each title opens the product in a new tab, to check what it holds. What a
 * change does is the caller's: the create form holds it until submit, the
 * account's page saves it at once.
 *
 * Without `onRemove`, every product is offered with None / Read / Read and
 * write — the create form, choosing from all of them. With it, the rows are
 * the ones the account reaches, each with Read / Read and write and an X.
 */
export function ProductAccessList({
  ownerAccountId,
  products,
  access,
  onChange,
  onRemove,
  disabled,
  empty,
  children,
}: {
  ownerAccountId: string;
  products: Pick<Product, "product_id" | "title">[];
  /** Access per product id; a product missing here has none. */
  access: Record<string, ProductAccess>;
  onChange: (product_id: string, access: ProductAccess | null) => void;
  onRemove?: (product_id: string) => void;
  disabled?: boolean;
  /** Shown in place of the list when there are no rows. */
  empty?: React.ReactNode;
  /** Further rows at the end of the list — the account page's draft row. */
  children?: React.ReactNode;
}) {
  if (products.length === 0 && !children) {
    return (
      <Text size="2" color="gray">
        {empty ?? `${ownerAccountId} has no products yet.`}
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
            <Flex align="center" gap="3">
              <SegmentedControl.Root
                size="1"
                aria-label={`Access to ${product_id}`}
                value={access[product_id] ?? NO_ACCESS}
                disabled={disabled}
                onValueChange={(next) =>
                  onChange(product_id, next === NO_ACCESS ? null : (next as ProductAccess))
                }
              >
                {!onRemove && <SegmentedControl.Item value={NO_ACCESS}>None</SegmentedControl.Item>}
                <SegmentedControl.Item value={MembershipRole.ReadData}>Read</SegmentedControl.Item>
                <SegmentedControl.Item value={MembershipRole.WriteData}>Read and write</SegmentedControl.Item>
              </SegmentedControl.Root>
              {onRemove && (
                <Tooltip content="Remove">
                  <IconButton
                    type="button"
                    size="1"
                    variant="ghost"
                    color="red"
                    disabled={disabled}
                    aria-label={`Remove access to ${product_id}`}
                    onClick={() => onRemove(product_id)}
                  >
                    <Cross2Icon />
                  </IconButton>
                </Tooltip>
              )}
            </Flex>
          }
        />
      ))}
      {children}
    </ConnectionList>
  );
}
