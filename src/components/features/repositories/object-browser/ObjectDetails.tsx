'use client';

import { Card, Box, DataList, Flex } from '@radix-ui/themes';
import type { Repository, RepositoryObject } from '@/types';
import { MonoText, SectionHeader } from '@/components/core';
import { DateText, BreadcrumbNav } from '@/components/display';
import { ChecksumVerifier } from '../ChecksumVerifier';
import { formatFileSize } from './utils';
import styles from '../ObjectBrowser.module.css';

interface ObjectDetailsProps {
  repository: Repository;
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