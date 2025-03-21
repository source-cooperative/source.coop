'use client';

import { Box, Text } from '@radix-ui/themes';
import { ChevronRightIcon, FileIcon, SlashIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MonoText } from '@/components/core';
import type { FileNode } from './utils';
import styles from '../ObjectBrowser.module.css';

interface DirectoryListProps {
  items: FileNode[];
  currentPath: string[];
  focusedIndex: number;
  itemRefs: React.MutableRefObject<(HTMLAnchorElement | null)[]>;
  onNavigateToPath: (path: string[]) => void;
  onNavigateToFile: (path: string) => void;
  setFocusedIndex: (index: number) => void;
}

const ITEM_HEIGHT = 40;
const MAX_VISIBLE_ITEMS = 20;

export function DirectoryList({
  items,
  currentPath,
  focusedIndex,
  itemRefs,
  onNavigateToPath,
  onNavigateToFile,
  setFocusedIndex
}: DirectoryListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Set up virtualizer with simple configuration
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 3,
    scrollPaddingStart: ITEM_HEIGHT / 2,
    scrollPaddingEnd: ITEM_HEIGHT / 2
  });

  if (items.length === 0) {
    return <Text color="gray">This directory is empty.</Text>;
  }

  return (
    <Box
      ref={parentRef}
      style={{
        ...(items.length > MAX_VISIBLE_ITEMS ? {
          maxHeight: `${Math.min(items.length * ITEM_HEIGHT, MAX_VISIBLE_ITEMS * ITEM_HEIGHT)}px`,
          overflow: 'auto',
          willChange: 'transform'
        } : {})
      }}
    >
      <Box
        style={{
          ...(items.length > MAX_VISIBLE_ITEMS ? {
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
            width: '100%'
          } : {
            width: '100%'
          })
        }}
      >
        {(items.length > MAX_VISIBLE_ITEMS
          ? rowVirtualizer.getVirtualItems()
          : items
        ).map((virtualRow, index) => {
          const item = items.length > MAX_VISIBLE_ITEMS ? items[virtualRow.index] : virtualRow;
          const itemIndex = items.length > MAX_VISIBLE_ITEMS ? virtualRow.index : index;
          
          return (
            <Box
              key={item.path}
              style={{
                ...(items.length > MAX_VISIBLE_ITEMS ? {
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  left: 0,
                  width: '100%',
                  height: `${ITEM_HEIGHT}px`,
                  willChange: 'transform'
                } : {
                  marginBottom: index < items.length - 1 ? 'var(--space-2)' : 0
                })
              }}
            >
              <Link
                ref={(el) => {
                  if (el) itemRefs.current[itemIndex] = el;
                }}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (item.isDirectory) {
                    onNavigateToPath([...currentPath, item.name]);
                  } else {
                    onNavigateToFile(item.path);
                  }
                }}
                className={styles.item}
                data-highlighted={itemIndex === focusedIndex}
                data-selected={itemIndex === focusedIndex}
                onFocus={() => setFocusedIndex(itemIndex)}
                onBlur={() => setFocusedIndex(-1)}
              >
                <Box style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  {item.isDirectory ? <SlashIcon /> : <FileIcon />}
                  <MonoText weight="regular" size="2">{item.name}</MonoText>
                  {item.isDirectory && <ChevronRightIcon />}
                </Box>
              </Link>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
} 