'use client';

import { useState } from 'react';
import type { Repository } from '@/types';
import { RepositoryListItem } from './RepositoryListItem';
import { ShortcutHelp } from '@/components/features/keyboard/ShortcutHelp';
import { useRepositoryListKeyboardShortcuts } from '@/hooks/useRepositoryListKeyboardShortcuts';

interface RepositoryListProps {
  repositories: Repository[];
}

export function RepositoryList({ repositories }: RepositoryListProps) {
  const [showHelp, setShowHelp] = useState(false);
  const { focusedIndex, setFocusedIndex, itemRefs } = useRepositoryListKeyboardShortcuts({
    repositories,
    onShowHelp: () => setShowHelp(true)
  });

  return (
    <>
      {repositories.map((repository, index) => (
        <RepositoryListItem
          key={`${repository.account.account_id}/${repository.repository_id}`}
          repository={repository}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          isFocused={index === focusedIndex}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex(-1)}
        />
      ))}
      <ShortcutHelp 
        open={showHelp} 
        onOpenChange={setShowHelp} 
        context="repository-list" 
      />
    </>
  );
} 