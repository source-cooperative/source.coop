import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/types";

interface UseProductListKeyboardShortcutsOptions {
  products: Product[];
  onShowHelp: () => void;
}

export function useProductListKeyboardShortcuts({
  products,
  onShowHelp,
}: UseProductListKeyboardShortcutsOptions) {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check if an input element is currently focused
      const activeElement = document.activeElement;
      const isInputActive =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.getAttribute("contenteditable") === "true");

      // If an input is active, don't handle keyboard shortcuts
      if (isInputActive) {
        return;
      }

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
            const product = products[selectedIndex];
            router.push(`/${product.account_id}/${product.product_id}`);
          }
          break;
        case "?":
          event.preventDefault();
          onShowHelp();
          break;
      }
    },
    [products, selectedIndex, onShowHelp, router]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => setSelectedIndex(0), [products]);

  return { selectedIndex };
}
