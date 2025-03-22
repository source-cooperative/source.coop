'use client';

import { useState } from 'react';
import type { Repository } from '@/types';
import { RepositoryListItem } from './RepositoryListItem';
import { ShortcutHelp } from '@/components/features/keyboard/ShortcutHelp';
import { useRepositoryListKeyboardShortcuts } from '@/hooks/useRepositoryListKeyboardShortcuts';
import { Box, Text } from '@radix-ui/themes';
import styles from './RepositoryList.module.css';

interface RepositoryListProps {
  repositories: Repository[];
}

export function RepositoryList({ repositories }: RepositoryListProps) {
  const [showHelp, setShowHelp] = useState(false);
  const { itemRefs, selectedIndex } = useRepositoryListKeyboardShortcuts({
    repositories,
    onShowHelp: () => setShowHelp(true)
  });

  // Filter out repositories without valid account information
  const validRepositories = repositories.filter(repo => repo.account && repo.account.account_id);

  if (!validRepositories.length) {
    return (
      <Text as="p" className={styles.empty}>
        No repositories found.
      </Text>
    );
  }

  return (
    <nav aria-label="Repository list">
      <ul className={styles.list} role="listbox">
        {validRepositories.map((repository, index) => (
          <li 
            key={`${repository.account.account_id}/${repository.repository_id}`} 
            role="option"
            aria-selected={index === selectedIndex}
          >
            <RepositoryListItem
              repository={repository}
              isSelected={index === selectedIndex}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
            />
          </li>
        ))}
      </ul>
      <ShortcutHelp 
        open={showHelp} 
        onOpenChange={setShowHelp} 
        context="repository-list" 
      />
    </nav>
  );
} 