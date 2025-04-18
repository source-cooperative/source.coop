import { useEffect, useState, useRef } from 'react';
import type { Product_v2 } from '@/types/product_v2';
import type { ProductObject } from '@/types/product_object';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

interface FileNode {
  name: string;
  path: string;
  size: number;
  updated_at: string;
  isDirectory: boolean;
  children?: { [key: string]: FileNode };
  object?: ProductObject;
}

interface UseObjectBrowserKeyboardShortcutsProps {
  product: Product_v2;
  objects: FileNode[];
  currentPath: string[];
  selectedObject?: ProductObject;
  onShowHelp: () => void;
  onNavigateToPath: (path: string[]) => void;
  onNavigateToFile: (path: string) => void;
  onCopy?: (fieldName: string) => void;
}

export function useObjectBrowserKeyboardShortcuts({
  product,
  objects,
  currentPath,
  selectedObject,
  onShowHelp,
  onNavigateToPath,
  onNavigateToFile,
  onCopy
}: UseObjectBrowserKeyboardShortcutsProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [selectedDataItem, setSelectedDataItem] = useState<string | null>(null);
  const [lastCopiedField, setLastCopiedField] = useState<string | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  useKeyboardShortcuts({ onShowHelp });

  // Reset copied field after delay
  useEffect(() => {
    if (lastCopiedField) {
      const timer = setTimeout(() => {
        setLastCopiedField(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [lastCopiedField]);

  // Add click handler to clear selection
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-selectable="true"]')) {
        setSelectedDataItem(null);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const selection = window.getSelection();
      const hasSelection = selection && selection.toString().length > 0;
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      // Handle copy of selected data first
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (hasSelection) {
          // Let browser handle selected text copy
          return;
        }
        if (selectedDataItem) {
          // Only handle our custom copy if no text is selected but we have a data item selected
          e.preventDefault();
          // Find the specific element that matches our selectedDataItem
          const element = document.querySelector(`[data-selectable="true"][data-item="${selectedDataItem}"]`);
          if (element) {
            const text = element.textContent || '';
            navigator.clipboard.writeText(text);
            setLastCopiedField(selectedDataItem);
            onCopy?.(selectedDataItem);
          }
        }
        return;
      }
      
      // Ignore other shortcuts if text is selected or if we're in an input/textarea
      if (hasSelection || isInput) {
        return;
      }

      // Handle single-key shortcuts (GitHub style)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        switch (e.key) {
          case 'j':
          case 'k':
            e.preventDefault();
            // In directory view
            if (!selectedObject || selectedObject.type === 'directory') {
              const newIndex = e.key === 'j' 
                ? Math.min(focusedIndex + 1, objects.length - 1)
                : Math.max(focusedIndex - 1, 0);
              setFocusedIndex(newIndex);
              itemRefs.current[newIndex]?.focus();
            }
            // In file view
            else {
              // Build dataItems array based on available metadata
              const dataItems = ['name', 'path', 'size', 'updated_at', 'type'];
              
              if (selectedObject.mime_type) {
                dataItems.push('mime_type');
              }
              
              if (selectedObject.metadata?.sha256) {
                dataItems.push('sha256');
              }
              
              if (selectedObject.metadata?.sha1) {
                dataItems.push('sha1');
              }

              // If no item is selected, j selects first item, k selects last item
              if (selectedDataItem === null) {
                setSelectedDataItem(e.key === 'j' ? dataItems[0] : dataItems[dataItems.length - 1]);
              } else {
                const currentIndex = dataItems.indexOf(selectedDataItem);
                const newIndex = e.key === 'j'
                  ? Math.min(currentIndex + 1, dataItems.length - 1)
                  : Math.max(currentIndex - 1, 0);
                setSelectedDataItem(dataItems[newIndex]);
              }
            }
            break;

          case 'y':
            e.preventDefault();
            // Copy permanent link
            if (selectedObject) {
              const url = window.location.origin + `/${product.account_id}/${product.product_id}/${selectedObject.path}`;
              navigator.clipboard.writeText(url);
            }
            break;

          case 'Enter':
            e.preventDefault();
            // If a data item is selected in the details view, copy it
            if (selectedDataItem) {
              const element = document.querySelector(`[data-selectable="true"][data-item="${selectedDataItem}"]`);
              if (element) {
                const text = element.textContent || '';
                navigator.clipboard.writeText(text);
                setLastCopiedField(selectedDataItem);
                onCopy?.(selectedDataItem);
              }
            } 
            // Otherwise handle navigation in directory listing
            else if (focusedIndex >= 0 && objects[focusedIndex]) {
              const item = objects[focusedIndex];
              if (item.isDirectory) {
                onNavigateToPath([...currentPath, item.name]);
              } else {
                onNavigateToFile(item.path);
              }
            }
            break;

          case 'Escape':
            e.preventDefault();
            setSelectedDataItem(null);
            setFocusedIndex(-1);
            break;
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedDataItem, focusedIndex, objects, currentPath, product, selectedObject, onNavigateToPath, onNavigateToFile, onCopy]);

  return {
    focusedIndex,
    setFocusedIndex,
    selectedDataItem,
    setSelectedDataItem,
    lastCopiedField,
    itemRefs
  };
} 