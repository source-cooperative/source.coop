'use client';

import { Text, Flex } from '@radix-ui/themes';
import { MonoText } from '@/components/MonoText';
import Link from 'next/link';
import { ChevronRightIcon } from '@radix-ui/react-icons';

interface BreadcrumbNavProps {
  account_id: string;
  repository_id: string;
  path: string[];
  fileName?: string;
  onNavigate: (path: string[]) => void;
}

export function BreadcrumbNav({ 
  account_id, 
  repository_id, 
  path, 
  fileName, 
  onNavigate 
}: BreadcrumbNavProps) {
  return (
    <Flex gap="1" align="center">
      {/* Root link - with underline */}
      <Link 
        href="#" 
        onClick={(e) => {
          e.preventDefault();
          onNavigate([]);
        }}
        style={{ 
          display: 'flex',
          alignItems: 'center',
          color: 'var(--gray-11)',
          textDecoration: 'underline'
        }}
      >
        <Text size="2">root</Text>
      </Link>
      
      {/* Path segments */}
      {path.map((segment, index) => {
        // Only treat last segment as non-clickable if we're in a directory view (no fileName)
        const isCurrentDirectory = !fileName && index === path.length - 1;
        
        return (
          <Flex key={segment} align="center" gap="1">
            <ChevronRightIcon />
            {isCurrentDirectory ? (
              /* Current directory - not clickable */
              <Text size="2" color="gray">{segment}</Text>
            ) : (
              /* Directory in path - clickable link */
              <Link 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(path.slice(0, index + 1));
                }}
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--gray-11)',
                  textDecoration: 'underline'
                }}
              >
                <Text size="2">{segment}</Text>
              </Link>
            )}
          </Flex>
        );
      })}
      
      {/* File name (if any) */}
      {fileName && (
        <Flex align="center" gap="1">
          <ChevronRightIcon />
          <Text size="2" color="gray">{fileName}</Text>
        </Flex>
      )}
    </Flex>
  );
}