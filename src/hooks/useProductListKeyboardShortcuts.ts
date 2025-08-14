import { useRef, useEffect, useCallback, useState } from "react";
import type { Product } from "@/types";

interface UseProductListKeyboardShortcutsOptions {
  products: Product[];
  onShowHelp: () => void;
}

export function useProductListKeyboardShortcuts({
  products,
  onShowHelp,
}: UseProductListKeyboardShortcutsOptions) {
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowDown":
        case "ArrowRight":
        case "j":
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < products.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
        case "ArrowLeft":
        case "k":
          event.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          if (products[selectedIndex]) {
            const element = itemRefs.current[selectedIndex];
            if (element) {
              element.click();
            }
          }
          break;
        case "?":
          event.preventDefault();
          onShowHelp();
          break;
      }
    },
    [products, selectedIndex, onShowHelp]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => setSelectedIndex(0), [products]);

  return { itemRefs, selectedIndex };
}
