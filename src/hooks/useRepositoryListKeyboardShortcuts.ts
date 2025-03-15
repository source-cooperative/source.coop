import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Repository } from '@/types';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

interface UseRepositoryListKeyboardShortcutsProps {
  repositories: Repository[];
  onShowHelp: () => void;
}

export function useRepositoryListKeyboardShortcuts({
  repositories,
  onShowHelp
}: UseRepositoryListKeyboardShortcutsProps) {
  const router = useRouter();
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const { awaitingSecondKey } = useKeyboardShortcuts({ onShowHelp });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if they're in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Handle copy URL sequence
      if (e.key === 'c' && !awaitingSecondKey) {
        e.preventDefault();
        if (focusedIndex >= 0) {
          const repository = repositories[focusedIndex];
          if (repository) {
            const url = window.location.origin + `/${repository.account.account_id}/${repository.repository_id}`;
            navigator.clipboard.writeText(url);
          }
        }
        return;
      }

      // Navigation
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        if (repositories.length === 0) return;
        const newIndex = focusedIndex <= 0 ? repositories.length - 1 : focusedIndex - 1;
        setFocusedIndex(newIndex);
        itemRefs.current[newIndex]?.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        if (repositories.length === 0) return;
        const newIndex = focusedIndex >= repositories.length - 1 ? 0 : focusedIndex + 1;
        setFocusedIndex(newIndex);
        itemRefs.current[newIndex]?.focus();
      } else if ((e.key === 'Enter' || e.key === 'o') && focusedIndex >= 0) {
        e.preventDefault();
        const repository = repositories[focusedIndex];
        if (repository) {
          router.push(`/${repository.account.account_id}/${repository.repository_id}`);
        }
      } else if (e.key === 'Escape' && e.shiftKey) {
        e.preventDefault();
        setFocusedIndex(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, repositories, router, awaitingSecondKey]);

  return {
    focusedIndex,
    setFocusedIndex,
    itemRefs
  };
} 