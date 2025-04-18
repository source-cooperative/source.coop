'use client';

import { ShortcutHelp } from '@/components/features/keyboard/ShortcutHelp';
import { useObjectBrowserKeyboardShortcuts } from '@/hooks/useObjectBrowserKeyboardShortcuts';
import { ObjectDetails } from './object-browser/ObjectDetails';
import { DirectoryList } from './object-browser/DirectoryList';
import { buildDirectoryTree } from './object-browser/utils';
import './ObjectBrowser.module.css';
import { ProductObject } from '@/types/product_object';
import { Product_v2 } from '@/types/product_v2';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useMemo } from 'react';
import { useRef } from 'react';
import { useState } from 'react';
import { Card, Box } from '@radix-ui/themes';
import { SectionHeader } from '@/components/core';
import { BreadcrumbNav } from '@/components/display';

export interface ObjectBrowserProps {
  product: Product_v2;
  objects: ProductObject[];
  initialPath?: string;
  selectedObject?: ProductObject;
}

export function ObjectBrowser({ product, objects, initialPath = '', selectedObject }: ObjectBrowserProps) {
  const router = useRouter(); 
  const [currentPath, setCurrentPath] = useState<string[]>(
    initialPath ? initialPath.split('/').filter(Boolean) : []
  );
  const [showHelp, setShowHelp] = useState(false);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

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

  const navigateToPath = useCallback(async (newPath: string[]) => {
    setCurrentPath(newPath);
    const urlPath = newPath.length > 0 ? '/' + newPath.join('/') : '';
    router.push(`/${product.account_id}/${product.product_id}${urlPath}`);
  }, [product, router]);

  const navigateToFile = useCallback((path: string) => {
    router.push(`/${product.account_id}/${product.product_id}/${path}`);
  }, [product, router]);

  const { 
    focusedIndex, 
    setFocusedIndex, 
    selectedDataItem
  } = useObjectBrowserKeyboardShortcuts({
    product,
    objects: items,
    currentPath,
    selectedObject,
    onShowHelp: () => setShowHelp(true),
    onNavigateToPath: navigateToPath,
    onNavigateToFile: navigateToFile
  });

  // If we have a selected object and it's a file, show file details
  // Only show file details if the file exists in our objects list
  if (selectedObject && selectedObject.type !== 'directory' && 
      objects.some(obj => obj.path === selectedObject.path)) {
    return (
      <>
        <ObjectDetails
          product={product}
          selectedObject={selectedObject}
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

  // For directory view, show the contents of the current directory
  return (
    <>
      <Card>
        <SectionHeader title="Product Contents">
          <Box style={{ 
            borderBottom: '1px solid var(--gray-5)',
            paddingBottom: 'var(--space-3)',
            marginBottom: 'var(--space-3)'
          }}>
            <BreadcrumbNav 
              path={currentPath}
              onNavigate={navigateToPath}
            />
          </Box>
        </SectionHeader>
        
        <DirectoryList
          items={items}
          currentPath={currentPath}
          focusedIndex={focusedIndex}
          itemRefs={itemRefs}
          onNavigateToPath={navigateToPath}
          onNavigateToFile={navigateToFile}
          setFocusedIndex={setFocusedIndex}
        />
      </Card>
      <ShortcutHelp 
        open={showHelp} 
        onOpenChange={setShowHelp} 
        context="object-browser" 
      />
    </>
  );
}