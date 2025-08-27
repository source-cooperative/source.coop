"use client";

import Link from "next/link";
import type { Product } from "@/types";
import { DateText } from "@/components/display";
import { Box, Text, Badge, Heading } from "@radix-ui/themes";
import { TagList } from "./TagList";

interface ProductListItemProps {
  product: Product;
  isSelected?: boolean;
}

const VISIBILITY_CONFIG = {
  public: { color: "green" as const, label: "Public" },
  unlisted: { color: "yellow" as const, label: "Unlisted" },
  restricted: { color: "red" as const, label: "Restricted" },
} as const;

export function ProductListItem({ product, isSelected }: ProductListItemProps) {
  const visibility =
    VISIBILITY_CONFIG[product.visibility] || VISIBILITY_CONFIG.restricted;

  return (
    <Box
      asChild
      data-selected={isSelected}
      aria-current={isSelected ? "page" : undefined}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
        padding: "var(--space-4)",
        borderRadius: "var(--radius-3)",
          border: "1px solid var(--gray-5)",
  background: "var(--gray-1)",
        transition: "border-color 0.15s ease-in-out",
        outline: "2px solid transparent",
        outlineOffset: "-1px",
        marginBottom: "var(--space-4)",
        contain: "content"
      }}
    >
      <article>
        <Link href={`/${product.account_id}/${product.product_id}`}>
          <Heading size="5" weight="bold" color="gray" mb="2">
            {product.title}
          </Heading>
        </Link>

        {product.description && (
          <Text as="p" size="2" color="gray" mb="4">
            {product.description}
          </Text>
        )}

        <Box
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            fontSize: "0.875rem",
            color: "var(--gray-11)"
          }}
        >
          {product.account?.name && (
            <>
              <Text size="1" color="gray">
                Provided by{" "}
                <Link href={`/${product.account_id}`}>
                  {product.account.name}
                </Link>
              </Text>
              {" • "}
            </>
          )}
          <Text size="1" color="gray">
            Published on <DateText date={product.created_at} />
          </Text>
          <Badge
            size="1"
            color={visibility.color}
            aria-label={`${visibility.label} product`}
          >
            {visibility.label}
          </Badge>
        </Box>

        {product.metadata.tags &&
          product.metadata.tags.filter(Boolean).length > 0 && (
            <TagList tags={product.metadata.tags} />
          )}
      </article>
    </Box>
  );
}
