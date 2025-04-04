'use client';

import { Box, Text, Flex } from '@radix-ui/themes';
import { ChevronRightIcon, FileIcon, SlashIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [prevPath, setPrevPath] = useState<string[]>(currentPath);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Set up virtualizer with simple configuration
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 3,
    scrollPaddingStart: ITEM_HEIGHT / 2,
    scrollPaddingEnd: ITEM_HEIGHT / 2
  });

  // Detect path changes to show loading state
  useEffect(() => {
    if (JSON.stringify(prevPath) !== JSON.stringify(currentPath)) {
      setIsLoading(true);
      setPrevPath(currentPath);
      
      // Reset loading state after a short delay
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [currentPath, prevPath]);

  // Check if we need to show scroll indicator
  useEffect(() => {
    if (items.length > MAX_VISIBLE_ITEMS) {
      setShowScrollIndicator(true);
      
      // Hide the indicator after 5 seconds
      const timer = setTimeout(() => {
        setShowScrollIndicator(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      setShowScrollIndicator(false);
    }
  }, [items.length]);

  if (isLoading) {
    return <Text color="gray">Loading...</Text>;
  }

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
          willChange: 'transform',
          position: 'relative'
        } : {})
      }}
    >
      {showScrollIndicator && (
        <Box 
          className={styles.scrollIndicator}
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '50%',
            zIndex: 10,
            background: 'var(--gray-3)',
            borderRadius: 'var(--radius-2)',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Text size="1" color="gray">Scroll for more</Text>
          <ChevronDownIcon width={12} height={12} />
        </Box>
      )}
      
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
        {items.length > MAX_VISIBLE_ITEMS ? (
          // Virtualized list
          rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = items[virtualRow.index];
            
            return (
              <Box
                key={item.path}
                style={{
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  left: 0,
                  width: '100%',
                  height: `${ITEM_HEIGHT}px`,
                  willChange: 'transform'
                }}
              >
                <Link
                  ref={(el) => {
                    if (el) itemRefs.current[virtualRow.index] = el;
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
                  onFocus={() => setFocusedIndex(virtualRow.index)}
                  className={styles.directoryItem}
                  data-focused={focusedIndex === virtualRow.index}
                >
                  <Flex align="center" gap="2">
                    {item.isDirectory ? (
                      <ChevronRightIcon width={16} height={16} />
                    ) : (
                      <FileIcon width={16} height={16} />
                    )}
                    <MonoText>{item.name}</MonoText>
                  </Flex>
                </Link>
              </Box>
            );
          })
        ) : (
          // Non-virtualized list
          items.map((item, index) => (
            <Box
              key={item.path}
              style={{
                marginBottom: index < items.length - 1 ? 'var(--space-2)' : 0
              }}
            >
              <Link
                ref={(el) => {
                  if (el) itemRefs.current[index] = el;
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
                onFocus={() => setFocusedIndex(index)}
                className={styles.directoryItem}
                data-focused={focusedIndex === index}
              >
                <Flex align="center" gap="2">
                  {item.isDirectory ? (
                    <ChevronRightIcon width={16} height={16} />
                  ) : (
                    <FileIcon width={16} height={16} />
                  )}
                  <MonoText>{item.name}</MonoText>
                </Flex>
              </Link>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
} 