import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { homeUrl, accountUrl, objectUrl } from "@/lib/urls";

interface UseKeyboardShortcutsProps {
  onShowHelp?: () => void;
}

export function useKeyboardShortcuts({ onShowHelp }: UseKeyboardShortcutsProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [awaitingSecondKey, setAwaitingSecondKey] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if there's any text selected
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        return;
      }

      // Ignore key events if they're in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ignore if any modifier keys are pressed (except for ?)
      if (e.key !== '?' && (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey)) {
        return;
      }

      // Handle help dialog first - ensure it works in all views
      if (e.key === '?' && !e.shiftKey && !e.ctrlKey && !e.altKey && !awaitingSecondKey) {
        e.preventDefault();
        e.stopPropagation();
        onShowHelp?.();
        return;
      }

      // Handle backtick for navigation
      if (e.key === '`' && !awaitingSecondKey) {
        e.preventDefault();
        
        // Split path into segments
        const segments = pathname.split('/').filter(Boolean);
        
        if (segments.length === 0) {
          // At root - do nothing
          return;
        } else if (segments.length === 1) {
          // On profile page - go to root
          router.push(homeUrl());
        } else if (segments.length === 2) {
          // On repository page - go to profile
          router.push(accountUrl(segments[0]));
        } else {
          // In object browser - go up one level
          router.push(
            objectUrl(segments[0], segments[1], segments.slice(2, -1).join("/"))
          );
        }
        return;
      }

      // Handle the first key of a sequence
      if (e.key === 'g' && !awaitingSecondKey) {
        e.preventDefault();
        setAwaitingSecondKey('g');
        return;
      }

      // Handle the second key of a sequence
      if (awaitingSecondKey === 'g') {
        e.preventDefault();
        if (e.key === 'h' || e.key === 'H') {
          router.push(homeUrl());
        }
        setAwaitingSecondKey(null);
        return;
      }

      // Clear awaiting state if any other key is pressed
      if (awaitingSecondKey) {
        setAwaitingSecondKey(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, awaitingSecondKey, onShowHelp, pathname]);

  return {
    awaitingSecondKey
  };
} 