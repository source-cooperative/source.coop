'use client';

import { Card, Box, Flex } from '@radix-ui/themes';
import { useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Repository_v2 } from '@/types/repository_v2';
import type { RepositoryObject } from '@/types/repository_object';
import { SectionHeader } from '@/components/core';
import { BreadcrumbNav } from '@/components/display';
import { ShortcutHelp } from '@/components/features/keyboard/ShortcutHelp';
import { useObjectBrowserKeyboardShortcuts } from '@/hooks/useObjectBrowserKeyboardShortcuts';
import { ObjectDetails } from './object-browser/ObjectDetails';
import { DirectoryList } from './object-browser/DirectoryList';
import { buildDirectoryTree } from './object-browser/utils';
import _styles from './ObjectBrowser.module.css';

export interface ObjectBrowserProps {
  repository: Repository_v2;
  objects: RepositoryObject[];
  initialPath?: string;
  selectedObject?: RepositoryObject;
}

export function ObjectBrowser({ repository, objects, initialPath = '', selectedObject }: ObjectBrowserProps) {
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
    router.push(`/${repository.account_id}/${repository.repository_id}${urlPath}`);
  }, [repository, router]);

  const navigateToFile = useCallback((path: string) => {
    router.push(`/${repository.account_id}/${repository.repository_id}/${path}`);
  }, [repository, router]);

  const { 
    focusedIndex, 
    setFocusedIndex, 
    selectedDataItem
  } = useObjectBrowserKeyboardShortcuts({
    repository,
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
          repository={repository}
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
        <SectionHeader title="Repository Contents">
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