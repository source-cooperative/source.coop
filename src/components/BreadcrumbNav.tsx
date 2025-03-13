'use client';

import { Flex } from '@radix-ui/themes';
import { MonoText } from '@/components/MonoText';
import Link from 'next/link';
import { ChevronRightIcon } from '@radix-ui/react-icons';
import { useState, useEffect } from 'react';

interface BreadcrumbNavProps {
  account_id: string;
  repository_id: string;
  path: string[];
  fileName?: string;
  onNavigate: (path: string[]) => void;
}

// Create a custom text component that works for both links and regular text
// with consistent vertical alignment
function NavText({ 
  children, 
  isLink, 
  onClick 
}: { 
  children: React.ReactNode; 
  isLink: boolean; 
  onClick?: () => void;
}) {
  const style: React.CSSProperties = {
    display: 'inline-block',
    position: 'relative' as const,
    top: 0,
    lineHeight: '22px',
    color: isLink ? 'var(--gray-11)' : 'var(--gray-9)'
  };
  
  if (isLink) {
    return (
      <Link 
        href="#" 
        onClick={(e) => { 
          e.preventDefault(); 
          onClick?.(); 
        }}
        style={style}
      >
        <MonoText size="2">{children}</MonoText>
      </Link>
    );
  }
  
  return (
    <span style={style}>
      <MonoText size="2" color="gray">{children}</MonoText>
    </span>
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
  
  // This useEffect runs after render to update the saved path info
  // but doesn't cause layout shifts during the current render
  useEffect(() => {
    setPrevPathLength(path.length);
    setPrevFileName(fileName);
  }, [path.length, fileName]);
  
  // For stability, we'll use the max of current and previous path lengths
  // to determine our rendering strategy
  const hasFile = fileName || prevFileName;
  const maxPathLength = Math.max(path.length, prevPathLength);
  
  // Create link styling that doesn't affect layout
  const linkStyle = { 
    color: 'var(--gray-11)',
    textDecorationThickness: '1px',  // Thinner underline to reduce jitter
  };
  
  return (
    <Flex gap="1" align="center">
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
      
      {/* Path segments */}
      {path.map((segment, index) => {
        const isLast = index === path.length - 1 && !fileName;
        
        return (
          <Flex key={segment} align="center" gap="1">
            <ChevronRightIcon />
            <div style={{ lineHeight: '22px' }}>
              {isLast ? (
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
      })}
      
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