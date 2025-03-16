'use client';

import { useState } from 'react';
import type { Repository } from '@/types';
import { RepositoryListItem } from './RepositoryListItem';
import { ShortcutHelp } from '@/components/features/keyboard/ShortcutHelp';
import { useRepositoryListKeyboardShortcuts } from '@/hooks/useRepositoryListKeyboardShortcuts';
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

  return (
    <nav aria-label="Repository list">
      <ul className={styles.list} role="listbox">
        {repositories.map((repository, index) => (
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