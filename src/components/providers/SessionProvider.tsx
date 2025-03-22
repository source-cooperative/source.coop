'use client';

import { useEffect, useState } from 'react';
import { getSession } from '@/lib/ory';
import type { ExtendedSession } from '@/lib/ory';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ExtendedSession | null>(null);

  useEffect(() => {
    const initSession = async () => {
      try {
        const sessionData = await getSession();
        setSession(sessionData);
      } catch (error) {
        console.error('Session provider error:', error);
      }
    };

    initSession();
  }, []);

  return (
    <div data-session={session ? JSON.stringify(session) : ''}>
      {children}
    </div>
  );
} 