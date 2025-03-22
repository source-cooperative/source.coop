'use client';

import { useEffect, useState } from 'react';
import type { ExtendedSession } from '@/lib/ory';
import { ory } from '@/lib/ory';

export function useSession() {
  const [session, setSession] = useState<ExtendedSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      try {
        // First try to get session from data attribute
        const sessionElement = document.querySelector('[data-session]');
        if (sessionElement) {
          const sessionData = sessionElement.getAttribute('data-session');
          if (sessionData) {
            setSession(JSON.parse(sessionData));
          }
        }

        // Then verify session with Ory
        const { data: orySession } = await ory.toSession();
        
        // Verify the session is active and has an identity
        if (orySession?.active && orySession?.identity) {
          setSession(orySession as ExtendedSession);
        } else {
          console.error('Invalid session:', orySession);
          setSession(null);
        }
      } catch (error) {
        console.error('Session initialization error:', error);
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, []);

  return { session, isLoading };
} 