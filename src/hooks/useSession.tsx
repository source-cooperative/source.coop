'use client';

import { useEffect, useState } from 'react';
import type { ExtendedSession } from '@/lib/ory';

export function useSession() {
  const [session, setSession] = useState<ExtendedSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionElement = document.querySelector('[data-session]');
    if (sessionElement) {
      const sessionData = sessionElement.getAttribute('data-session');
      if (sessionData) {
        setSession(JSON.parse(sessionData));
      }
    }
    setIsLoading(false);
  }, []);

  return { session, isLoading };
} 