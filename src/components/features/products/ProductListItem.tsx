"use client";

// For homepage and general listing
import { forwardRef } from "react";
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

export const ProductListItem = forwardRef<HTMLAnchorElement, ProductListItemProps>(
  function ProductListItem({ product, isSelected }, ref) {
    return (
      <Link
        href={`/${product.account_id}/${product.product_id}`}
        className={styles.item}
        data-selected={isSelected}
        ref={ref}
        aria-current={isSelected ? "page" : undefined}
      >
        <Box asChild>
          <article>
            <Heading size="5" weight="bold" color="gray" mb="2">
              {product.title}
            </Heading>

            {product.description && (
              <Text as="p" size="2" color="gray" mb="4" mr="2">
                {product.description}
              </Text>
            )}

            {product.metadata.tags &&
              product.metadata.tags.filter(Boolean).length > 0 && (
                <TagList tags={product.metadata.tags} />
              )}

            <Box>
              {product.account?.name && (
                <Text size="1" color="gray" mb="2" mr="2">
                  {product.account.name}
                </Text>
              )}
              <Text size="1" color="gray" mb="2" mr="2">
                Updated <DateText date={product.updated_at} />
              </Text>
              <Badge
                size="1"
                color={
                  product.visibility === "public"
                    ? "green"
                    : product.visibility === "unlisted"
                    ? "yellow"
                    : "red"
                }
                aria-label={
                  product.visibility === "public"
                    ? "Public product"
                    : product.visibility === "unlisted"
                    ? "Unlisted product"
                    : "Restricted product"
                }
              >
                {product.visibility === "public"
                  ? "Public"
                  : product.visibility === "unlisted"
                  ? "Unlisted"
                  : "Restricted"}
              </Badge>
            </Box>
          </article>
        </Box>
      </Link>
    );
  }
);
