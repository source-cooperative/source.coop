'use client';

import { useState } from 'react';
import type { Repository_v2 } from '@/types/repository_v2';
import { RepositoryListItem } from './RepositoryListItem';
import { ShortcutHelp } from '@/components/features/keyboard/ShortcutHelp';
import { useRepositoryListKeyboardShortcuts } from '@/hooks/useRepositoryListKeyboardShortcuts';
import { Text } from '@radix-ui/themes';
import styles from './RepositoryList.module.css';

interface RepositoryListProps {
  repositories: Repository_v2[];
}

export function RepositoryList({ repositories }: RepositoryListProps) {
  const [showHelp, setShowHelp] = useState(false);
  const { itemRefs, selectedIndex } = useRepositoryListKeyboardShortcuts({
    repositories,
    onShowHelp: () => setShowHelp(true)
  });

  if (!repositories.length) {
    return (
      <Text as="p" className={styles.empty}>
        No repositories found.
      </Text>
    );
  }

  return (
    <nav aria-label="Repository list">
      <ul className={styles.list} role="listbox">
        {repositories.map((repository, index) => (
          <li 
            key={`${repository.account_id}/${repository.repository_id}`} 
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