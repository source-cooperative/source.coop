import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Repository, RepositoryObject } from '@/types';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

interface FileNode {
  name: string;
  path: string;
  size: number;
  updated_at: string;
  isDirectory: boolean;
  children?: { [key: string]: FileNode };
  object?: RepositoryObject;
}

interface UseObjectBrowserKeyboardShortcutsProps {
  repository: Repository;
  objects: FileNode[];
  currentPath: string[];
  selectedObject?: RepositoryObject;
  onShowHelp: () => void;
  onNavigateToPath: (path: string[]) => void;
  onNavigateToFile: (path: string) => void;
}

export function useObjectBrowserKeyboardShortcuts({
  repository,
  objects,
  currentPath,
  selectedObject,
  onShowHelp,
  onNavigateToPath,
  onNavigateToFile
}: UseObjectBrowserKeyboardShortcutsProps) {
  const router = useRouter();
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [selectedDataItem, setSelectedDataItem] = useState<string | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const { awaitingSecondKey } = useKeyboardShortcuts({ onShowHelp });

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
      // Ignore if text is selected or if we're in an input/textarea
      const selection = window.getSelection();
      const hasSelection = selection && selection.toString().length > 0;
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      
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
              const dataItems = [
                'name',
                'path',
                'size',
                'type',
                'updated_at',
                'mime_type',
                'sha256',
                'sha1'
              ];
              const currentIndex = dataItems.indexOf(selectedDataItem || dataItems[0]);
              const newIndex = e.key === 'j'
                ? Math.min(currentIndex + 1, dataItems.length - 1)
                : Math.max(currentIndex - 1, 0);
              setSelectedDataItem(dataItems[newIndex]);
            }
            break;

          case 'y':
            e.preventDefault();
            // Copy permanent link
            if (selectedObject) {
              const url = window.location.origin + `/${repository.account.account_id}/${repository.repository_id}/${selectedObject.path}`;
              navigator.clipboard.writeText(url);
            }
            break;

          case 'Enter':
            e.preventDefault();
            if (focusedIndex >= 0 && objects[focusedIndex]) {
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

      // Handle copy of selected data
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedDataItem) {
        e.preventDefault();
        const element = document.querySelector(`[data-selectable="true"]`);
        if (element) {
          const text = element.textContent || '';
          navigator.clipboard.writeText(text);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedDataItem, focusedIndex, objects, currentPath, repository, selectedObject, onNavigateToPath, onNavigateToFile]);

  return {
    focusedIndex,
    setFocusedIndex,
    selectedDataItem,
    setSelectedDataItem,
    itemRefs
  };
} 