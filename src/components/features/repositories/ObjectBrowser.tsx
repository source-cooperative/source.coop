'use client';

import { Text, Card, Flex, Box, DataList } from '@radix-ui/themes';
import { ChevronRightIcon, FileIcon, SlashIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Repository, RepositoryObject } from '@/types';
import { MonoText, SectionHeader } from '@/components/core';
import { DateText, BreadcrumbNav } from '@/components/display';
import { ShortcutHelp } from '@/components/features/keyboard/ShortcutHelp';
import { ChecksumVerifier } from './ChecksumVerifier';
import { useObjectBrowserKeyboardShortcuts } from '@/hooks/useObjectBrowserKeyboardShortcuts';

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
  children?: { [key: string]: FileNode };
  object?: RepositoryObject;
}

export function ObjectBrowser({ repository, objects, initialPath = '', selectedObject }: ObjectBrowserProps) {
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState<string[]>(
    initialPath ? initialPath.split('/').filter(Boolean) : []
  );
  const [showHelp, setShowHelp] = useState(false);

  const navigateToPath = (newPath: string[]) => {
    setCurrentPath(newPath);
    const pathString = newPath.length > 0 ? '/' + newPath.join('/') : '';
    router.push(`/${repository.account.account_id}/${repository.repository_id}${pathString}`);
  };

  const navigateToFile = (path: string) => {
    router.push(`/${repository.account.account_id}/${repository.repository_id}/${path}`);
  };

  // Build directory tree
  const root: { [key: string]: FileNode } = {};
  
  // First pass: create all file nodes and their parent directory paths
  objects.sort((a, b) => a.path.localeCompare(b.path)).forEach(obj => {
    const parts = obj.path.split('/');
    let current = root;
    
    // Create directory nodes for each part of the path
    parts.slice(0, -1).forEach((part, index) => {
      const fullPath = parts.slice(0, index + 1).join('/');
      if (!current[part]) {
        current[part] = {
          name: part,
          path: fullPath,
          size: 0,
          updated_at: obj.updated_at,
          isDirectory: true,
          children: {}
        };
      }
      current = current[part].children!;
    });

    // Create the file node
    const fileName = parts[parts.length - 1];
    current[fileName] = {
      name: fileName,
      path: obj.path,
      size: obj.size,
      updated_at: obj.updated_at,
      isDirectory: obj.type === 'directory',
      object: obj
    };
  });

  if (!objects || objects.length === 0) {
    return (
      <Card>
        <Text color="gray">This repository has no data.</Text>
      </Card>
    );
  }

  const getCurrentDirectory = () => {
    let current = root;
    for (const part of currentPath) {
      if (!current[part] || !current[part].children) {
        return {};
      }
      current = current[part].children!;
    }
    return current;
  };

  const currentDir = getCurrentDirectory();
  const items = Object.values(currentDir).sort((a, b) => {
    // Directories first, then files
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

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

  // If a specific file is selected, display its details
  if (selectedObject && selectedObject.type !== 'directory') {
    const pathParts = selectedObject.path.split('/').filter(Boolean);
    const fileName = pathParts.pop();
    
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
                path={pathParts}
                fileName={fileName}
                onNavigate={navigateToPath}
              />
            </Box>
          </SectionHeader>
          
          <DataList.Root>
            <DataList.Item>
              <DataList.Label minWidth="120px">Name</DataList.Label>
              <DataList.Value>
                <MonoText style={{
                  backgroundColor: selectedDataItem === 'name' ? 'var(--accent-4)' : undefined,
                  outline: selectedDataItem === 'name' ? '2px solid var(--accent-8)' : 'none',
                  padding: '2px',
                  borderRadius: 'var(--radius-2)'
                }} data-selectable="true">
                  {selectedObject.path.split('/').pop()}
                </MonoText>
              </DataList.Value>
            </DataList.Item>
            
            <DataList.Item>
              <DataList.Label minWidth="120px">Path</DataList.Label>
              <DataList.Value>
                <MonoText style={{
                  backgroundColor: selectedDataItem === 'path' ? 'var(--accent-4)' : undefined,
                  outline: selectedDataItem === 'path' ? '2px solid var(--accent-8)' : 'none',
                  padding: '2px',
                  borderRadius: 'var(--radius-2)'
                }} data-selectable="true">
                  {selectedObject.path}
                </MonoText>
              </DataList.Value>
            </DataList.Item>
            
            <DataList.Item>
              <DataList.Label minWidth="120px">Size</DataList.Label>
              <DataList.Value>
                <MonoText style={{
                  backgroundColor: selectedDataItem === 'size' ? 'var(--accent-4)' : undefined,
                  outline: selectedDataItem === 'size' ? '2px solid var(--accent-8)' : 'none',
                  padding: '2px',
                  borderRadius: 'var(--radius-2)'
                }} data-selectable="true">
                  {formatFileSize(selectedObject.size)}
                </MonoText>
              </DataList.Value>
            </DataList.Item>
            
            <DataList.Item>
              <DataList.Label minWidth="120px">Last Updated</DataList.Label>
              <DataList.Value>
                <MonoText style={{
                  backgroundColor: selectedDataItem === 'updated_at' ? 'var(--accent-4)' : undefined,
                  outline: selectedDataItem === 'updated_at' ? '2px solid var(--accent-8)' : 'none',
                  padding: '2px',
                  borderRadius: 'var(--radius-2)'
                }} data-selectable="true">
                  <DateText date={selectedObject.updated_at} includeTime={true} />
                </MonoText>
              </DataList.Value>
            </DataList.Item>
            
            <DataList.Item>
              <DataList.Label minWidth="120px">Type</DataList.Label>
              <DataList.Value>
                <MonoText style={{
                  backgroundColor: selectedDataItem === 'type' ? 'var(--accent-4)' : undefined,
                  outline: selectedDataItem === 'type' ? '2px solid var(--accent-8)' : 'none',
                  padding: '2px',
                  borderRadius: 'var(--radius-2)'
                }} data-selectable="true">
                  {selectedObject.type}
                </MonoText>
              </DataList.Value>
            </DataList.Item>

            {selectedObject.mime_type && (
              <DataList.Item>
                <DataList.Label minWidth="120px">Content Type</DataList.Label>
                <DataList.Value>
                  <MonoText style={{
                    backgroundColor: selectedDataItem === 'mime_type' ? 'var(--accent-4)' : undefined,
                    outline: selectedDataItem === 'mime_type' ? '2px solid var(--accent-8)' : 'none',
                    padding: '2px',
                    borderRadius: 'var(--radius-2)'
                  }} data-selectable="true">
                    {selectedObject.mime_type}
                  </MonoText>
                </DataList.Value>
              </DataList.Item>
            )}

            {selectedObject.metadata && selectedObject.metadata.sha256 && (
              <DataList.Item>
                <DataList.Label minWidth="120px">SHA-256</DataList.Label>
                <DataList.Value>
                  <Flex gap="3" align="center">
                    <MonoText style={{
                      backgroundColor: selectedDataItem === 'sha256' ? 'var(--accent-4)' : undefined,
                      outline: selectedDataItem === 'sha256' ? '2px solid var(--accent-8)' : 'none',
                      padding: '2px',
                      borderRadius: 'var(--radius-2)'
                    }} data-selectable="true">
                      {selectedObject.metadata.sha256}
                    </MonoText>
                    <ChecksumVerifier
                      objectUrl={`/api/${repository.account.account_id}/${repository.repository_id}/objects/${selectedObject.path}`}
                      expectedHash={selectedObject.metadata.sha256}
                      algorithm="SHA-256"
                    />
                  </Flex>
                </DataList.Value>
              </DataList.Item>
            )}

            {selectedObject.metadata && selectedObject.metadata.sha1 && (
              <DataList.Item>
                <DataList.Label minWidth="120px">SHA-1</DataList.Label>
                <DataList.Value>
                  <Flex gap="3" align="center">
                    <MonoText style={{
                      backgroundColor: selectedDataItem === 'sha1' ? 'var(--accent-4)' : undefined,
                      outline: selectedDataItem === 'sha1' ? '2px solid var(--accent-8)' : 'none',
                      padding: '2px',
                      borderRadius: 'var(--radius-2)'
                    }} data-selectable="true">
                      {selectedObject.metadata.sha1}
                    </MonoText>
                    <ChecksumVerifier
                      objectUrl={`/api/${repository.account.account_id}/${repository.repository_id}/objects/${selectedObject.path}`}
                      expectedHash={selectedObject.metadata.sha1}
                      algorithm="SHA-1"
                    />
                  </Flex>
                </DataList.Value>
              </DataList.Item>
            )}
          </DataList.Root>
        </Card>
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
          <Box>
            {items.map((item, index) => (
              <Link
                key={item.path}
                ref={(el) => {
                  itemRefs.current[index] = el;
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
                style={{
                  display: 'block',
                  borderBottom: '1px solid var(--gray-4)',
                  transition: 'background-color 0.2s ease',
                  backgroundColor: index === focusedIndex ? 
                    'var(--accent-4)' : 
                    undefined,
                  outline: index === focusedIndex ? 
                    '2px solid var(--accent-8)' : 
                    'none',
                  padding: '2px',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 
                    document.documentElement.classList.contains('dark') 
                      ? 'var(--gray-4)' 
                      : 'var(--gray-3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 
                    index === focusedIndex ? 
                      'var(--accent-4)' : 
                      '';
                }}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(-1)}
              >
                <Flex 
                  align="center" 
                  gap="2" 
                  py="2"
                >
                  {item.isDirectory ? (
                    <SlashIcon />
                  ) : (
                    <FileIcon />
                  )}
                  <MonoText weight="regular" size="2">{item.name}</MonoText>
                  {item.isDirectory && <ChevronRightIcon />}
                </Flex>
              </Link>
            ))}
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