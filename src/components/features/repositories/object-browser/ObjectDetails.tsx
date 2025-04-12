'use client';

import { Card, Box, DataList, Flex, IconButton, Tooltip } from '@radix-ui/themes';
import { CopyIcon, CheckIcon } from '@radix-ui/react-icons';
import type { RepositoryObject } from '@/types';
import type { Repository_v2 } from '@/types/repository_v2';
import { SectionHeader } from '@/components/core';
import { DateText, BreadcrumbNav } from '@/components/display';
import { ChecksumVerifier } from '../ChecksumVerifier';
import { formatFileSize } from './utils';
import { useState, useEffect } from 'react';
import { DataListItem } from "./DataListItem";

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
        <Box
          style={{
            borderBottom: "1px solid var(--gray-5)",
            paddingBottom: "var(--space-3)",
            marginBottom: "var(--space-3)",
          }}
        >
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
        <DataListItem
          label="Name"
          value={fileName}
          selectedDataItem={selectedDataItem}
          itemKey="name"
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />

        <DataListItem
          label="Size"
          value={formatFileSize(selectedObject.size)}
          selectedDataItem={selectedDataItem}
          itemKey="size"
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />

        <DataListItem
          label="Content Type"
          value={selectedObject.mime_type}
          selectedDataItem={selectedDataItem}
          itemKey="content_type"
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />

        <DataListItem
          label="Last Modified"
          value={
            <DateText date={selectedObject.updated_at} includeTime={true} />
          }
          selectedDataItem={selectedDataItem}
          itemKey="updated_at"
          copiedField={copiedField}
          onCopy={(_, field) => {
            const dateStr = new Date(
              selectedObject.updated_at
            ).toLocaleString();
            copyToClipboard(dateStr, field);
          }}
        />

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

        {repository.account && (
          <DataListItem
            label="Source URL"
            value={`https://data.source.coop/${repository.account.account_id}/${repository.repository_id}/${selectedObject.path}`}
            selectedDataItem={selectedDataItem}
            itemKey="source_url"
            copiedField={copiedField}
            onCopy={copyToClipboard}
          />
        )}

        {repository.metadata?.mirrors && repository.metadata.primary_mirror && (
          <DataListItem
            label="Cloud URI"
            value={`s3://${
              repository.metadata.mirrors[repository.metadata.primary_mirror]
                .config.bucket
            }/${
              repository.metadata.mirrors[repository.metadata.primary_mirror]
                .prefix
            }${selectedObject.path}`}
            selectedDataItem={selectedDataItem}
            itemKey="cloud_uri"
            copiedField={copiedField}
            onCopy={copyToClipboard}
          />
        )}
      </DataList.Root>
    </Card>
  );
} 