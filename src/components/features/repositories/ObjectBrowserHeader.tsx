'use client';

import { Box, Flex } from '@radix-ui/themes';
import { BreadcrumbNav } from '@/components/display';
import { useObjectBrowser } from './ObjectBrowserContext';
import styles from './ObjectBrowser.module.css';

export function ObjectBrowserHeader() {
  const { currentPath, navigateTo } = useObjectBrowser();

  return (
    <Box 
      className={styles.header}
      style={{ 
        borderBottom: '1px solid var(--gray-5)',
        paddingBottom: 'var(--space-3)',
        marginBottom: 'var(--space-3)'
      }}
    >
      <Flex justify="between" align="center">
        <BreadcrumbNav 
          path={currentPath}
          onNavigate={navigateTo}
        />
      </Flex>
    </Box>
  );
} 