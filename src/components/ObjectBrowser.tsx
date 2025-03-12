'use client';

import { Text, Card, Flex, Box, Button } from '@radix-ui/themes';
import { MonoText } from '@/components/MonoText';
import { ChevronRightIcon, ChevronLeftIcon, FileIcon, SlashIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ObjectBrowserProps {
  account_id: string;
  repository_id: string;
  objects: Array<{
    path: string;
    size: number;
    updated_at: string;
  }>;
  initialPath?: string;
}

interface FileNode {
  name: string;
  path: string;
  size: number;
  updated_at: string;
  isDirectory: boolean;
  children?: { [key: string]: FileNode };
  object?: Object;  // Reference to the actual object if this is a file
}

export function ObjectBrowser({ account_id, repository_id, objects, initialPath = '' }: ObjectBrowserProps) {
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState<string[]>(
    initialPath ? initialPath.split('/').filter(Boolean) : []
  );
  
  const navigateToPath = (newPath: string[]) => {
    setCurrentPath(newPath);
    const pathString = newPath.length > 0 ? '/' + newPath.join('/') : '';
    router.push(`/${account_id}/${repository_id}/browse${pathString}`);
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
          updated_at: obj.updated_at, // Directory takes latest update time of any child
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
      isDirectory: false,
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

  return (
    <Card>
      <Flex direction="column" gap="2">
        {/* Breadcrumb navigation */}
        <Flex align="center" gap="1" mb="2">
          <MonoText size="2">
            {currentPath.length > 0 ? (
              <Link
                href={`/${account_id}/${repository_id}/browse`}
                onClick={(e) => {
                  e.preventDefault();
                  navigateToPath([]);
                }}
                style={{ textDecoration: 'underline' }}
              >
                root
              </Link>
            ) : (
              <span>root</span>
            )}
            {currentPath.map((part, index) => (
              <span key={index}>
                <Text> / </Text>
                {index === currentPath.length - 1 ? (
                  <span>{part}</span>
                ) : (
                  <Link
                    href={`/${account_id}/${repository_id}/browse/${currentPath.slice(0, index + 1).join('/')}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateToPath(currentPath.slice(0, index + 1));
                    }}
                    style={{ textDecoration: 'underline' }}
                  >
                    {part}
                  </Link>
                )}
              </span>
            ))}
          </MonoText>
        </Flex>

        {/* Files and directories */}
        {items.map((item) => (
          <Box key={item.path} p="2">
            <Flex justify="between" align="center">
              <Flex align="center" gap="2" style={{ flex: 1 }}>
                {item.isDirectory ? <SlashIcon /> : <FileIcon />}
                {item.isDirectory ? (
                  <Button 
                    variant="ghost" 
                    onClick={() => navigateToPath([...currentPath, item.name])}
                  >
                    <MonoText size="2">{item.name}/</MonoText>
                  </Button>
                ) : (
                  <Link 
                    href={`/${account_id}/${repository_id}/objects/${item.path}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <MonoText size="2">{item.name}</MonoText>
                  </Link>
                )}
              </Flex>
              <Flex gap="4" align="center">
                {!item.isDirectory && (
                  <>
                    <Text size="2" color="gray">
                      {formatBytes(item.size)}
                    </Text>
                    <Text size="2" color="gray">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </Text>
                  </>
                )}
              </Flex>
            </Flex>
          </Box>
        ))}
      </Flex>
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
} 