'use client';

import { Text, Card, Grid, Box, DataList } from '@radix-ui/themes';
import { ChevronRightIcon, FileIcon, SlashIcon, UpdateIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Repository, RepositoryObject } from '@/types';
import { MonoText, SectionHeader } from '@/components/core';
import { DateText, BreadcrumbNav } from '@/components/display';
import { ShortcutHelp } from '@/components/features/keyboard/ShortcutHelp';
import { ChecksumVerifier } from './ChecksumVerifier';
import { useObjectBrowserKeyboardShortcuts } from '@/hooks/useObjectBrowserKeyboardShortcuts';
import styles from './ObjectBrowser.module.css';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface ObjectBrowserProps {
  repository: Repository;
  objects: RepositoryObject[];
  initialPath?: string;
  selectedObject?: RepositoryObject;
}

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
  
  // Filter objects for current directory level only
  objects.forEach(obj => {
    // Skip if doesn't match prefix
    if (prefix && !obj.path.startsWith(prefix)) return;
    
    // Get relative path from current directory
    const relativePath = obj.path.slice(prefix.length);
    if (!relativePath) return;
    
    // Get path parts
    const parts = relativePath.split('/');
    if (!parts[0]) return;
    
    const nodeName = parts[0];
    const isDirectory = parts.length > 1 || obj.type === 'directory';
    
    // Only add if it's a direct child of current path
    if (!root[nodeName]) {
      root[nodeName] = {
        name: nodeName,
        path: obj.path,
        size: obj.size,
        updated_at: obj.updated_at,
        isDirectory,
        object: parts.length === 1 ? obj : undefined
      };
    }
  });

  return root;
}

// Move file details into separate component
function ObjectDetails({ 
  repository, 
  selectedObject, 
  currentPath, 
  selectedDataItem,
  onNavigate 
}: { 
  repository: Repository;
  selectedObject: RepositoryObject;
  currentPath: string[];
  selectedDataItem: string | null;
  onNavigate: (path: string[]) => void;
}) {
  const pathParts = selectedObject.path.split('/').filter(Boolean);
  const fileName = pathParts.pop();

  return (
    <Card>
      <SectionHeader title="Repository Contents">
        <Box style={{ 
          borderBottom: '1px solid var(--gray-5)',
          paddingBottom: 'var(--space-3)',
          marginBottom: 'var(--space-3)'
        }}>
          <BreadcrumbNav 
            account_id={repository.account.account_id}
            repository_id={repository.repository_id}
            path={pathParts}
            fileName={fileName}
            onNavigate={onNavigate}
          />
        </Box>
      </SectionHeader>
      
      <DataList.Root>
        <DataList.Item>
          <DataList.Label minWidth="120px">Name</DataList.Label>
          <DataList.Value>
            <MonoText className={styles.selectableText} 
              data-selected={selectedDataItem === 'name'}
              data-selectable="true" 
              data-item="name">
              {fileName}
            </MonoText>
          </DataList.Value>
        </DataList.Item>
        
        <DataList.Item>
          <DataList.Label minWidth="120px">Path</DataList.Label>
          <DataList.Value>
            <MonoText className={styles.selectableText}
              data-selected={selectedDataItem === 'path'}
              data-selectable="true" 
              data-item="path">
              {selectedObject.path}
            </MonoText>
          </DataList.Value>
        </DataList.Item>
        
        <DataList.Item>
          <DataList.Label minWidth="120px">Size</DataList.Label>
          <DataList.Value>
            <MonoText className={styles.selectableText}
              data-selected={selectedDataItem === 'size'}
              data-selectable="true" 
              data-item="size">
              {formatFileSize(selectedObject.size)}
            </MonoText>
          </DataList.Value>
        </DataList.Item>
        
        <DataList.Item>
          <DataList.Label minWidth="120px">Last Updated</DataList.Label>
          <DataList.Value>
            <MonoText className={styles.selectableText}
              data-selected={selectedDataItem === 'updated_at'}
              data-selectable="true" 
              data-item="updated_at">
              <DateText date={selectedObject.updated_at} includeTime={true} />
            </MonoText>
          </DataList.Value>
        </DataList.Item>
        
        <DataList.Item>
          <DataList.Label minWidth="120px">Type</DataList.Label>
          <DataList.Value>
            <MonoText className={styles.selectableText}
              data-selected={selectedDataItem === 'type'}
              data-selectable="true" 
              data-item="type">
              {selectedObject.type}
            </MonoText>
          </DataList.Value>
        </DataList.Item>

        {selectedObject.mime_type && (
          <DataList.Item>
            <DataList.Label minWidth="120px">Content Type</DataList.Label>
            <DataList.Value>
              <MonoText className={styles.selectableText}
                data-selected={selectedDataItem === 'mime_type'}
                data-selectable="true" 
                data-item="mime_type">
                {selectedObject.mime_type}
              </MonoText>
            </DataList.Value>
          </DataList.Item>
        )}

        {selectedObject.metadata && selectedObject.metadata.sha256 && (
          <DataList.Item>
            <DataList.Label minWidth="120px">Checksum</DataList.Label>
            <DataList.Value>
              <ChecksumVerifier 
                objectUrl={`/api/${repository.account.account_id}/${repository.repository_id}/objects/${selectedObject.path}`}
                expectedHash={selectedObject.metadata.sha256}
                algorithm="SHA-256"
              />
            </DataList.Value>
          </DataList.Item>
        )}
      </DataList.Root>
    </Card>
  );
}

// Add loading progress indicator
function LoadingProgress({ current, total }: { current: number; total: number }) {
  const percentage = Math.round((current / total) * 100);
  return (
    <Text size="1" color="gray">
      Loading {percentage}% ({current} of {total} items)
    </Text>
  );
}

// Memoize container height calculation
const getContainerHeight = (itemCount: number, itemHeight: number, maxItems: number) => {
  return Math.min(
    Math.max(itemCount * itemHeight, itemHeight), 
    maxItems * itemHeight
  );
};

// Add path cache to component state
export function ObjectBrowser({ repository, objects, initialPath = '', selectedObject }: ObjectBrowserProps) {
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState<string[]>(
    initialPath ? initialPath.split('/').filter(Boolean) : []
  );
  const [showHelp, setShowHelp] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  // Get current directory items
  const items = useMemo(() => {
    const root = buildDirectoryTree(objects, currentPath);
    return Object.values(root).sort((a, b) => {
      // Directories first, then alphabetically
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }, [objects, currentPath]);

  // Set up virtualizer with simple configuration
  const ITEM_HEIGHT = 40;
  const MAX_VISIBLE_ITEMS = 20;
  
  // Memoize container height
  const containerHeight = useMemo(() => 
    getContainerHeight(items.length, ITEM_HEIGHT, MAX_VISIBLE_ITEMS),
    [items.length]
  );

  // Optimize virtualizer configuration
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 3, // Reduced from 5 for better performance
    scrollPaddingStart: ITEM_HEIGHT / 2,
    scrollPaddingEnd: ITEM_HEIGHT / 2
  });

  const navigateToPath = useCallback(async (newPath: string[]) => {
    setCurrentPath(newPath);
    const urlPath = newPath.length > 0 ? '/' + newPath.join('/') : '';
    router.push(`/${repository.account.account_id}/${repository.repository_id}${urlPath}`);
  }, [repository, router]);

  const navigateToFile = useCallback((path: string) => {
    router.push(`/${repository.account.account_id}/${repository.repository_id}/${path}`);
  }, [repository, router]);

  const { 
    focusedIndex, 
    setFocusedIndex, 
    selectedDataItem,
    itemRefs 
  } = useObjectBrowserKeyboardShortcuts({
    repository,
    objects: items,
    currentPath,
    selectedObject,
    onShowHelp: () => setShowHelp(true),
    onNavigateToPath: navigateToPath,
    onNavigateToFile: navigateToFile
  });

  // If a specific file is selected, show file details
  if (selectedObject && selectedObject.type !== 'directory') {
    return (
      <>
        <ObjectDetails
          repository={repository}
          selectedObject={selectedObject}
          currentPath={currentPath}
          selectedDataItem={selectedDataItem}
          onNavigate={navigateToPath}
        />
        <ShortcutHelp 
          open={showHelp} 
          onOpenChange={setShowHelp} 
          context="object-details" 
        />
      </>
    );
  }

  return (
    <>
      <Card>
        <SectionHeader title="Repository Contents">
          <Box style={{ 
            borderBottom: '1px solid var(--gray-5)',
            paddingBottom: 'var(--space-3)',
            marginBottom: 'var(--space-3)'
          }}>
            <BreadcrumbNav 
              account_id={repository.account.account_id}
              repository_id={repository.repository_id}
              path={currentPath}
              onNavigate={navigateToPath}
            />
          </Box>
        </SectionHeader>
        
        {/* Directory contents */}
        {items.length === 0 ? (
          <Text color="gray">This directory is empty.</Text>
        ) : (
          <Box
            ref={parentRef}
            style={{
              ...(items.length > MAX_VISIBLE_ITEMS ? {
                maxHeight: `${containerHeight}px`,
                overflow: 'auto',
                willChange: 'transform' // Optimize scrolling performance
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
                        willChange: 'transform' // Optimize transform performance
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
                          navigateToPath([...currentPath, item.name]);
                        } else {
                          navigateToFile(item.path);
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
        )}
      </Card>
      <ShortcutHelp 
        open={showHelp} 
        onOpenChange={setShowHelp} 
        context="object-browser" 
      />
    </>
  );
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}