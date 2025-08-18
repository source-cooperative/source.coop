"use client";

import { useState } from "react";
import type { Product } from "@/types";
import { ProductListItem } from "./ProductListItem";
import { ShortcutHelp } from "@/components/features/keyboard/ShortcutHelp";
import { useProductListKeyboardShortcuts } from "@/hooks/useProductListKeyboardShortcuts";
import { Text } from "@radix-ui/themes";
import styles from "./ProductList.module.css";

interface ProductListProps {
  products: Product[];
}

export function ProductList({ products }: ProductListProps) {
  const [showHelp, setShowHelp] = useState(false);

  const { itemRefs, selectedIndex } = useProductListKeyboardShortcuts({
    products,
    onShowHelp: () => setShowHelp(true),
  });

  if (!products.length) {
    return (
      <Text as="p" className={styles.empty}>
        No products found.
      </Text>
    );
  }

  return (
    <div>
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
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
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
    </div>
  );
}
