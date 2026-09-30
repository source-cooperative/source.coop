"use client";

import { useState } from "react";
import { Box, Text } from "@radix-ui/themes";
import type { Product } from "@/types";
import { ProductListItem } from "./ProductListItem";
import { ShortcutHelp } from "@/components/features/keyboard/ShortcutHelp";
import { useProductListKeyboardShortcuts } from "@/hooks/useProductListKeyboardShortcuts";
import { Pagination } from "./Pagination";
import styles from "./ProductList.module.css";

export interface PaginationProps {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
  previousCursor?: string;
  currentCursor?: string;
}

interface ProductsListProps {
  products: Product[];
  grid?: boolean;
  pagination?: PaginationProps;
}

export function ProductsList({
  products,
  grid = false,
  pagination,
}: ProductsListProps) {
  const [showHelp, setShowHelp] = useState(false);

  const { selectedIndex } = useProductListKeyboardShortcuts({
    products,
    onShowHelp: () => setShowHelp(true),
  });

  if (!products.length) {
    return (
      <Box p="8">
        <Text size="3" color="gray" align="center">
          No products found matching your criteria.
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <nav aria-label="Product list">
        {/* ponytail: a plain list, not a listbox. The j/k shortcuts are a
            document-level keydown handler with no focus management and no
            aria-activedescendant, so listbox/option promised a widget that
            isn't implemented — and role="option" may not contain the link
            each item renders. aria-current carries the highlight instead. */}
        <ul className={grid ? styles.gridList : styles.list}>
          {products.map((product, index) => (
            <li
              key={`${product.account_id}/${product.product_id}`}
              aria-current={index === selectedIndex || undefined}
            >
              <ProductListItem
                product={product}
                isSelected={index === selectedIndex}
              />
            </li>
          ))}
        </ul>
      </nav>

      {pagination && <Pagination {...pagination} />}

      <ShortcutHelp
        open={showHelp}
        onOpenChange={setShowHelp}
        context="product-list"
      />
    </Box>
  );
}
