'use client';

import { Box, Text } from '@radix-ui/themes';
import { ChevronRightIcon, FileIcon, SlashIcon } from '@radix-ui/react-icons';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useMemo } from 'react';
import type { Repository, RepositoryObject } from '@/types';
import { useObjectBrowser } from './ObjectBrowserContext';
import { useObjectBrowserKeyboardShortcuts } from '@/hooks/useObjectBrowserKeyboardShortcuts';
import styles from './ObjectBrowser.module.css';

interface FileNode {
  name: string;
  path: string;
  size: number;
  updated_at: string;
  isDirectory: boolean;
  object?: RepositoryObject;
}

// Simplified tree building that only shows current directory contents
function buildDirectoryTree(objects: RepositoryObject[], currentPath: string[] = []) {
  const root: { [key: string]: FileNode } = {};
  const prefix = currentPath.length > 0 ? currentPath.join('/') + '/' : '';
  
  objects.forEach(obj => {
    if (prefix && !obj.path.startsWith(prefix)) return;
    
    const relativePath = obj.path.slice(prefix.length);
    if (!relativePath) return;
    
    const parts = relativePath.split('/');
    if (!parts[0]) return;
    
    if (parts.length > 1) {
      const nodeName = parts[0];
      if (!root[nodeName]) {
        root[nodeName] = {
          name: nodeName,
          path: prefix + nodeName,
          size: 0,
          updated_at: new Date().toISOString(),
          isDirectory: true
        };
      }
      return;
    }
    
    const nodeName = parts[0];
    if (!root[nodeName] || !root[nodeName].isDirectory) {
      root[nodeName] = {
        name: nodeName,
        path: obj.path,
        size: obj.size,
        updated_at: obj.updated_at,
        isDirectory: obj.type === 'directory',
        object: obj
      };
    }
  });

  return root;
}

interface ObjectListProps {
  repository: Repository;
  objects: RepositoryObject[];
}

export function ObjectList({ repository, objects }: ObjectListProps) {
  const { currentPath, selectedObject, setSelectedObject, navigateTo } = useObjectBrowser();
  const parentRef = useRef<HTMLDivElement>(null);

  // Get current directory items
  const items = useMemo(() => {
    const root = buildDirectoryTree(objects, currentPath);
    return Object.values(root).sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }, [objects, currentPath]);

  // Set up virtualizer
  const ITEM_HEIGHT = 40;
  const MAX_VISIBLE_ITEMS = 20;
  
  const containerHeight = useMemo(() => 
    Math.min(
      Math.max(items.length * ITEM_HEIGHT, ITEM_HEIGHT), 
      MAX_VISIBLE_ITEMS * ITEM_HEIGHT
    ),
    [items.length]
  );

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5
  });

  // Set up keyboard shortcuts
  useObjectBrowserKeyboardShortcuts({
    repository,
    objects: items,
    currentPath,
    selectedObject: selectedObject || undefined,
    onShowHelp: () => {}, // Handled by parent
    onNavigateToPath: (path) => navigateTo(path),
    onNavigateToFile: (path) => {
      const file = items.find(item => item.path === path);
      if (file?.object) {
        setSelectedObject(file.object);
      }
    }
  });

  return (
    <Box ref={parentRef} className={styles.listContainer} style={{ height: containerHeight }}>
      <Box
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          const isSelected = selectedObject?.path === item.path;

          return (
            <Box
              key={item.path}
              className={styles.listItem}
              data-selected={isSelected}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              onClick={() => setSelectedObject(item.object || null)}
            >
              <Box className={styles.itemContent}>
                {item.isDirectory ? (
                  <SlashIcon className={styles.icon} />
                ) : (
                  <FileIcon className={styles.icon} />
                )}
                <Text size="2" className={styles.itemName}>
                  {item.name}
                </Text>
                <ChevronRightIcon className={styles.chevron} />
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
} 