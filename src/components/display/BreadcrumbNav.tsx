'use client';

import { Flex, Box, Text } from '@radix-ui/themes';
import Link from 'next/link';
import { ChevronRightIcon } from '@radix-ui/react-icons';
import { useState, useEffect } from 'react';
import { MonoText } from '@/components/core';

interface BreadcrumbNavProps {
  account_id: string;
  repository_id: string;
  path: string[];
  fileName?: string;
  onNavigate: (path: string[]) => void;
}

function NavText({ 
  children, 
  isLink, 
  onClick 
}: { 
  children: React.ReactNode; 
  isLink: boolean; 
  onClick?: () => void;
}) {
  if (isLink) {
    return (
      <Box asChild>
        <Link href="#" onClick={(e) => { e.preventDefault(); onClick?.(); }}>
          <MonoText size="2" color="gray" highContrast>
            {children}
          </MonoText>
        </Link>
      </Box>
    );
  }
  
  return (
    <Box>
      <MonoText size="2" color="gray">
        {children}
      </MonoText>
    </Box>
  );
}

export function BreadcrumbNav({ 
  account_id, 
  repository_id, 
  path, 
  fileName, 
  onNavigate 
}: BreadcrumbNavProps) {
  const isRoot = path.length === 0 && !fileName;
  
  // Store previous path in state to prevent jitter when navigating
  const [prevPathLength, setPrevPathLength] = useState(path.length);
  const [prevFileName, setPrevFileName] = useState(fileName);
  
  useEffect(() => {
    setPrevPathLength(path.length);
    setPrevFileName(fileName);
  }, [path.length, fileName]);
  
  const hasFile = fileName || prevFileName;
  const maxPathLength = Math.max(path.length, prevPathLength);
  
  // Create link styling that doesn't affect layout
  const linkStyle = { 
    color: 'var(--gray-11)',
    textDecorationThickness: '1px',
  };

  // Function to render a path segment
  const renderSegment = (segment: string, index: number, isClickable: boolean = true) => (
    <Flex key={`${index}-${segment}`} align="center" gap="1">
      <ChevronRightIcon />
      <div style={{ lineHeight: '22px' }}>
        {!isClickable ? (
          <MonoText size="2" color="gray">{segment}</MonoText>
        ) : (
          <Link 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              onNavigate(path.slice(0, index + 1));
            }}
            style={linkStyle}
          >
            <MonoText size="2">{segment}</MonoText>
          </Link>
        )}
      </div>
    </Flex>
  );

  // Determine which segments to show
  const MAX_VISIBLE_SEGMENTS = 4; // Show at most 2 at start and 2 at end
  let visibleSegments: JSX.Element[] = [];
  
  if (path.length > 0) {
    if (path.length <= MAX_VISIBLE_SEGMENTS) {
      // Show all segments if path is short enough
      visibleSegments = path.map((segment, index) => 
        renderSegment(segment, index, !(index === path.length - 1) || Boolean(fileName))
      );
    } else {
      // Show first 2 and last 2 segments with ellipsis
      const firstSegments = path.slice(0, 2).map((segment, index) => 
        renderSegment(segment, index)
      );
      
      const lastSegments = path.slice(-2).map((segment, index) => 
        renderSegment(segment, path.length - 2 + index, !(index === 1) || Boolean(fileName))
      );
      
      visibleSegments = [
        ...firstSegments,
        <Flex key="ellipsis" align="center" gap="1">
          <ChevronRightIcon />
          <div style={{ lineHeight: '22px' }}>
            <MonoText size="2" color="gray">...</MonoText>
          </div>
        </Flex>,
        ...lastSegments
      ];
    }
  }
  
  return (
    <Flex>
      {/* Root link */}
      <div style={{ lineHeight: '22px' }}>
        {isRoot ? (
          <MonoText size="2" color="gray">root</MonoText>
        ) : (
          <Link 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              onNavigate([]);
            }}
            style={linkStyle}
          >
            <MonoText size="2">root</MonoText>
          </Link>
        )}
      </div>
      
      {/* Path segments with possible truncation */}
      {visibleSegments}
      
      {/* File name */}
      {fileName && (
        <Flex align="center" gap="1">
          <ChevronRightIcon />
          <div style={{ lineHeight: '22px' }}>
            <MonoText size="2" color="gray">{fileName}</MonoText>
          </div>
        </Flex>
      )}
    </Flex>
  );
}