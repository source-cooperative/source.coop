"use client";

import Link from "next/link";
import type { Product } from "@/types";
import { DateText } from "@/components/display";
import { Box, Text, Badge, Heading } from "@radix-ui/themes";
import { TagList } from "./TagList";
import styles from "./ProductList.module.css";
import { productUrl } from "@/lib/urls";
import { DisplayNameLink } from "@/components/core";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslations } from "next-intl";

interface ProductListItemProps {
  product: Product;
  isSelected?: boolean;
}

// Listings show a description's inline formatting only; the full description
// is on the product page. Headings and links collapse to their text, as a
// listing links only within Source. Tables and code blocks have no readable
// inline form, so they are allowed only so the components below can drop them:
// left disallowed, unwrapDisallowed would spill their text into the card.
const DESCRIPTION_ELEMENTS = [
  "p", "strong", "em", "del", "code", "ul", "ol", "li", "br", "table", "pre",
];
const DESCRIPTION_COMPONENTS: Components = {
  table: () => null,
  pre: () => null,
};

const VISIBILITY_CONFIG = {
  public: { color: "green" as const, labelKey: "public", ariaKey: "publicProduct" },
  unlisted: { color: "yellow" as const, labelKey: "unlisted", ariaKey: "unlistedProduct" },
  restricted: { color: "red" as const, labelKey: "restricted", ariaKey: "restrictedProduct" },
} as const;

export function ProductListItem({ product, isSelected }: ProductListItemProps) {
  const t = useTranslations("ProductListItem");
  const visibility =
    VISIBILITY_CONFIG[product.visibility] || VISIBILITY_CONFIG.restricted;

  return (
    <Box
      className={styles.item}
      data-selected={isSelected}
      aria-current={isSelected ? "page" : undefined}
    >
      <article>
        <Link href={productUrl(product.account_id, product.product_id)}>
          <Heading size="5" weight="bold" color="gray" mb="2">
            {product.title}
          </Heading>
        </Link>

        {product.description && (
          <Text
            as="div"
            size="2"
            color="gray"
            mb="4"
            className={styles.description}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              allowedElements={DESCRIPTION_ELEMENTS}
              components={DESCRIPTION_COMPONENTS}
              unwrapDisallowed
            >
              {product.description}
            </ReactMarkdown>
          </Text>
        )}

        <div className={styles.itemSpacer} />

        <Box className={styles.metadata}>
          {product.account?.name && (
            <>
              <Text size="1" color="gray">
                {t.rich("providedBy", {
                  account: () => <DisplayNameLink account={product.account!} />,
                })}
              </Text>
              {" • "}
            </>
          )}
          <Text size="1" color="gray">
            {t.rich("publishedOn", {
              date: () => <DateText date={product.created_at} />,
            })}
          </Text>
          <Badge
            size="1"
            color={visibility.color}
            aria-label={t(visibility.ariaKey)}
          >
            {t(visibility.labelKey)}
          </Badge>
          {product.disabled && (
            <Badge size="1" color="amber" aria-label={t("deactivatedProduct")}>
              {t("deactivated")}
            </Badge>
          )}
        </Box>

        {product.metadata.tags &&
          product.metadata.tags.filter(Boolean).length > 0 && (
            <TagList tags={product.metadata.tags} />
          )}
      </article>
    </Box>
  );
}
