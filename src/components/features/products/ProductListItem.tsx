"use client";

import Link from "next/link";
import type { Product } from "@/types";
import type { CatalogEntry } from "@/types/catalog";
import { hasCatalogStats, ProductCatalogStats } from "./ProductCatalogStats";
import { DateText } from "@/components/display";
import { Box, Text, Badge, Heading } from "@radix-ui/themes";
import { TagList } from "./TagList";
import styles from "./ProductList.module.css";
import { productUrl } from "@/lib/urls";
import { DisplayNameLink } from "@/components/core";

interface ProductListItemProps {
  product: Product;
  isSelected?: boolean;
  catalogEntry?: CatalogEntry;
}

const VISIBILITY_CONFIG = {
  public: { color: "green" as const, label: "Public" },
  unlisted: { color: "yellow" as const, label: "Unlisted" },
  restricted: { color: "red" as const, label: "Restricted" },
} as const;

export function ProductListItem({
  product,
  isSelected,
  catalogEntry,
}: ProductListItemProps) {
  const visibility =
    VISIBILITY_CONFIG[product.visibility] || VISIBILITY_CONFIG.restricted;
  const showCatalog = hasCatalogStats(catalogEntry);

  return (
    <Box
      className={styles.item}
      data-selected={isSelected}
      aria-current={isSelected ? "page" : undefined}
    >
      <article className={showCatalog ? styles.splitCard : undefined}>
        <div className={styles.productDetails}>
          <Link href={productUrl(product.account_id, product.product_id)}>
            <Heading size="5" weight="bold" color="gray" mb="2">
              {product.title}
            </Heading>
          </Link>

          {product.description && (
            <Text as="p" size="2" color="gray" mb="4">
              {product.description}
            </Text>
          )}

          <div className={styles.itemSpacer} />

          <Box className={styles.metadata}>
            {product.account?.name && (
              <>
                <Text size="1" color="gray">
                  Provided by <DisplayNameLink account={product.account!} />
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
            {product.disabled && (
              <Badge size="1" color="amber" aria-label="Deactivated product">
                Deactivated
              </Badge>
            )}
          </Box>

          {product.metadata.tags &&
            product.metadata.tags.filter(Boolean).length > 0 && (
              <TagList tags={product.metadata.tags} />
            )}
        </div>
        {showCatalog && (
          <div className={styles.catalogSummary}>
            <ProductCatalogStats entry={catalogEntry} />
          </div>
        )}
      </article>
    </Box>
  );
}
