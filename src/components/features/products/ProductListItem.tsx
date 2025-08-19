"use client";

import Link from "next/link";
import type { Product } from "@/types";
import { DateText } from "@/components/display";
import { Box, Text, Badge, Heading } from "@radix-ui/themes";
import { TagList } from "./TagList";
import styles from "./ProductList.module.css";

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
      className={styles.item}
      data-selected={isSelected}
      aria-current={isSelected ? "page" : undefined}
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

        <Box className={styles.metadata}>
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
