import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Product } from "@/types";

interface UseProductListKeyboardShortcutsProps {
  products: Product[];
  onShowHelp: () => void;
}

export function useProductListKeyboardShortcuts({
  products,
  onShowHelp
}: UseProductListKeyboardShortcutsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Focus the selected item when selection changes
  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.focus();
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ignore if any modifier keys are pressed (except for ?)
      if (e.key !== '?' && (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey)) {
        return;
      }

      switch (e.key) {
        case 'j':
        case 'ArrowDown': {
          e.preventDefault();
          const newIndex = selectedIndex === -1 ? 0 : Math.min(selectedIndex + 1, products.length - 1);
          setSelectedIndex(newIndex);
          break;
        }
        case 'k':
        case 'ArrowUp': {
          e.preventDefault();
          const newIndex = selectedIndex === -1 ? 0 : Math.max(selectedIndex - 1, 0);
          setSelectedIndex(newIndex);
          break;
        }
        case 'Enter':
        case 'o':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < products.length) {
            const product = products[selectedIndex];
            router.push(`/${product.account_id}/${product.product_id}`);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedIndex(-1);
          break;
        case '?':
          e.preventDefault();
          onShowHelp();
          break;
        case '`':
          e.preventDefault();
          // Split path into segments
          {
            const segments = pathname.split('/').filter(Boolean);
            
            if (segments.length === 0) {
              // At root - do nothing
              return;
            } else if (segments.length === 1) {
              // On profile page - go to root
              router.push('/');
            } else if (segments.length === 2) {
              // On repository page - go to profile
              router.push(`/${segments[0]}`);
            } else {
              // In object browser - go up one level
              router.push(`/${segments[0]}/${segments[1]}/${segments.slice(2, -1).join('/')}`);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, selectedIndex, router, onShowHelp, pathname]);

  return {
    selectedIndex,
    setSelectedIndex,
    itemRefs
  };
} 