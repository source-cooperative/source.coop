'use client';

import { Card, Box, DataList, Flex, IconButton, Tooltip } from '@radix-ui/themes';
import { CopyIcon, CheckIcon } from '@radix-ui/react-icons';
import type { RepositoryObject } from '@/types';
import type { Repository_v2 } from '@/types/repository_v2';
import { MonoText, SectionHeader } from '@/components/core';
import { DateText, BreadcrumbNav } from '@/components/display';
import { ChecksumVerifier } from '../ChecksumVerifier';
import { formatFileSize } from './utils';
import styles from '../ObjectBrowser.module.css';
import { useState, useEffect } from 'react';

interface ObjectDetailsProps {
  repository: Repository_v2;
  selectedObject: RepositoryObject;
  selectedDataItem: string | null;
  onNavigate: (path: string[]) => void;
}

export function ObjectDetails({ 
  repository, 
  selectedObject, 
  selectedDataItem,
  onNavigate
}: ObjectDetailsProps) {
  const pathParts = selectedObject.path.split('/').filter(Boolean);
  const fileName = pathParts.pop();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Handle keyboard shortcuts directly in the component
  useEffect(() => {
    // Skip if no item is selected - no need to attach listeners
    if (!selectedDataItem) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const selection = window.getSelection();
      const hasSelection = selection && selection.toString().length > 0;
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      
      // Skip if there's text selected or we're in an input
      if (hasSelection || isInput) return;
      
      // Handle copy with Cmd/Ctrl+C or Enter
      if ((e.key === 'Enter' || ((e.ctrlKey || e.metaKey) && e.key === 'c'))) {
        e.preventDefault();
        
        // Find the element with the selected data item
        const element = document.querySelector(`[data-selectable="true"][data-item="${selectedDataItem}"]`);
        if (element) {
          const text = element.textContent || '';
          navigator.clipboard.writeText(text);
          
          // Update the copied field
          setCopiedField(selectedDataItem);
          
          // Reset after animation time
          setTimeout(() => {
            setCopiedField(null);
          }, 1500);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedDataItem]);

  const copyToClipboard = (text: string | undefined, field: string) => {
    navigator.clipboard.writeText(text || '').then(() => {
      setCopiedField(field);
      
      // Reset the copied field after animation time
      setTimeout(() => {
        setCopiedField(null);
      }, 1500);
    });
  };

  return (
    <Card>
      <SectionHeader title="Repository Contents">
        <Box style={{ 
          borderBottom: '1px solid var(--gray-5)',
          paddingBottom: 'var(--space-3)',
          marginBottom: 'var(--space-3)'
        }}>
          <Flex justify="between" align="center">
            <BreadcrumbNav 
              path={pathParts}
              fileName={fileName}
              onNavigate={onNavigate}
            />
          </Flex>
        </Box>
      </SectionHeader>
      
      <DataList.Root>
        <DataList.Item>
          <DataList.Label minWidth="120px">Name</DataList.Label>
          <DataList.Value>
            <Flex align="center" gap="2">
              <MonoText className={styles.selectableText} 
                data-selected={selectedDataItem === 'name'}
                data-selectable="true" 
                data-item="name">
                {fileName}
              </MonoText>
              <Tooltip content="Copy to clipboard">
                <IconButton 
                  size="1" 
                  variant="ghost" 
                  color={copiedField === 'name' ? 'green' : 'gray'}
                  onClick={() => copyToClipboard(fileName || '', 'name')}
                  aria-label="Copy name"
                >
                  {copiedField === 'name' ? <CheckIcon /> : <CopyIcon />}
                </IconButton>
              </Tooltip>
            </Flex>
          </DataList.Value>
        </DataList.Item>
        
        <DataList.Item>
          <DataList.Label minWidth="120px">Path</DataList.Label>
          <DataList.Value>
            <Flex align="center" gap="2">
              <MonoText className={styles.selectableText}
                data-selected={selectedDataItem === 'path'}
                data-selectable="true" 
                data-item="path">
                {selectedObject.path}
              </MonoText>
              <Tooltip content="Copy to clipboard">
                <IconButton 
                  size="1" 
                  variant="ghost" 
                  color={copiedField === 'path' ? 'green' : 'gray'}
                  onClick={() => copyToClipboard(selectedObject.path, 'path')}
                  aria-label="Copy path"
                >
                  {copiedField === 'path' ? <CheckIcon /> : <CopyIcon />}
                </IconButton>
              </Tooltip>
            </Flex>
          </DataList.Value>
        </DataList.Item>
        
        <DataList.Item>
          <DataList.Label minWidth="120px">Size</DataList.Label>
          <DataList.Value>
            <Flex align="center" gap="2">
              <MonoText className={styles.selectableText}
                data-selected={selectedDataItem === 'size'}
                data-selectable="true" 
                data-item="size">
                {formatFileSize(selectedObject.size)}
              </MonoText>
              <Tooltip content="Copy to clipboard">
                <IconButton 
                  size="1" 
                  variant="ghost" 
                  color={copiedField === 'size' ? 'green' : 'gray'}
                  onClick={() => copyToClipboard(formatFileSize(selectedObject.size), 'size')}
                  aria-label="Copy size"
                >
                  {copiedField === 'size' ? <CheckIcon /> : <CopyIcon />}
                </IconButton>
              </Tooltip>
            </Flex>
          </DataList.Value>
        </DataList.Item>
        
        <DataList.Item>
          <DataList.Label minWidth="120px">Last Updated</DataList.Label>
          <DataList.Value>
            <Flex align="center" gap="2">
              <MonoText className={styles.selectableText}
                data-selected={selectedDataItem === 'updated_at'}
                data-selectable="true" 
                data-item="updated_at">
                <DateText date={selectedObject.updated_at} includeTime={true} />
              </MonoText>
              <Tooltip content="Copy to clipboard">
                <IconButton 
                  size="1" 
                  variant="ghost" 
                  color={copiedField === 'updated_at' ? 'green' : 'gray'}
                  onClick={() => {
                    const dateStr = new Date(selectedObject.updated_at).toLocaleString();
                    copyToClipboard(dateStr, 'updated_at');
                  }}
                  aria-label="Copy last updated date"
                >
                  {copiedField === 'updated_at' ? <CheckIcon /> : <CopyIcon />}
                </IconButton>
              </Tooltip>
            </Flex>
          </DataList.Value>
        </DataList.Item>
        
        <DataList.Item>
          <DataList.Label minWidth="120px">Type</DataList.Label>
          <DataList.Value>
            <Flex align="center" gap="2">
              <MonoText className={styles.selectableText}
                data-selected={selectedDataItem === 'type'}
                data-selectable="true" 
                data-item="type">
                {selectedObject.type}
              </MonoText>
              <Tooltip content="Copy to clipboard">
                <IconButton 
                  size="1" 
                  variant="ghost" 
                  color={copiedField === 'type' ? 'green' : 'gray'}
                  onClick={() => copyToClipboard(selectedObject.type, 'type')}
                  aria-label="Copy type"
                >
                  {copiedField === 'type' ? <CheckIcon /> : <CopyIcon />}
                </IconButton>
              </Tooltip>
            </Flex>
          </DataList.Value>
        </DataList.Item>

        {selectedObject.mime_type && (
          <DataList.Item>
            <DataList.Label minWidth="120px">Content Type</DataList.Label>
            <DataList.Value>
              <Flex align="center" gap="2">
                <MonoText className={styles.selectableText}
                  data-selected={selectedDataItem === 'mime_type'}
                  data-selectable="true" 
                  data-item="mime_type">
                  {selectedObject.mime_type}
                </MonoText>
                <Tooltip content="Copy to clipboard">
                  <IconButton 
                    size="1" 
                    variant="ghost" 
                    color={copiedField === 'mime_type' ? 'green' : 'gray'}
                    onClick={() => copyToClipboard(selectedObject.mime_type || '', 'mime_type')}
                    aria-label="Copy content type"
                  >
                    {copiedField === 'mime_type' ? <CheckIcon /> : <CopyIcon />}
                  </IconButton>
                </Tooltip>
              </Flex>
            </DataList.Value>
          </DataList.Item>
        )}

        {selectedObject.metadata && selectedObject.metadata.sha256 && repository.account && (
          <DataList.Item>
            <DataList.Label minWidth="120px">Checksum</DataList.Label>
            <DataList.Value>
              <Flex align="center" gap="2">
                <ChecksumVerifier 
                  objectUrl={`/api/${repository.account.account_id}/${repository.repository_id}/objects/${selectedObject.path}`}
                  expectedHash={selectedObject.metadata.sha256}
                  algorithm="SHA-256"
                />
                <Tooltip content="Copy to clipboard">
                  <IconButton 
                    size="1" 
                    variant="ghost" 
                    color={copiedField === 'sha256' ? 'green' : 'gray'}
                    onClick={() => copyToClipboard(selectedObject.metadata?.sha256 || '', 'sha256')}
                    aria-label="Copy SHA-256 checksum"
                  >
                    {copiedField === 'sha256' ? <CheckIcon /> : <CopyIcon />}
                  </IconButton>
                </Tooltip>
              </Flex>
            </DataList.Value>
          </DataList.Item>
        )}
      </DataList.Root>
    </Card>
  );
} 