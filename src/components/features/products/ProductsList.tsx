"use client";

import { useState } from "react";
import { Box, Text } from "@radix-ui/themes";
import type { Product } from "@/types";
import { ProductListItem } from "./ProductListItem";
import { ShortcutHelp } from "@/components/features/keyboard/ShortcutHelp";
import { useProductListKeyboardShortcuts } from "@/hooks/useProductListKeyboardShortcuts";
import styles from "./ProductList.module.css";

interface ProductsListProps {
  products: Product[];
}

export function ProductsList({ products }: ProductsListProps) {
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
        <ul className={styles.list} role="listbox">
          {products.map((product, index) => (
            <li
              key={`${product.account_id}/${product.product_id}`}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <ProductListItem
                product={product}
                isSelected={index === selectedIndex}
              />
            </li>
          ))}
        </ul>
      </nav>

      <ShortcutHelp
        open={showHelp}
        onOpenChange={setShowHelp}
        context="product-list"
      />
    </Box>
  );
}
