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
        // First check if we have session data in API response
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        
        if (data && data.authenticated !== false) {
          // We have a valid session from our API
          setSession(data as ExtendedSession);
          setIsLoading(false);
          return;
        }
        
        // No valid session from API, client is unauthenticated
        setSession(null);
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