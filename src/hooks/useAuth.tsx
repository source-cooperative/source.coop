'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ory } from '@/lib/ory';
import { Session, Identity } from '@ory/client';

interface UseAuthResult {
  isLoading: boolean;
  error: Error | null;
  session: SessionWithMetadata | null;
}

interface SessionWithMetadata extends Session {
  identity?: Identity & {
    metadata_public?: {
      account_id?: string;
      is_admin?: boolean;
    };
  };
}

// Consolidated auth hook that uses Ory SDK directly
export function useAuth(): UseAuthResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [session, setSession] = useState<SessionWithMetadata | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        // Use Ory SDK directly per CURSOR_RULES
        const { data } = await ory.toSession();
        
        if (isMounted) {
          setSession(data as SessionWithMetadata);
        }
      } catch (err) {
        // Don't log 401 errors - they're expected for unauthenticated users
        if (!(err instanceof Error && err.message.includes('401'))) {
          console.error('Auth check error:', err);
        }
        
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to check auth'));
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router, pathname, searchParams]); // Re-run when URL changes

  return { isLoading, error, session };
}

// Hook for protected routes
export function useRequireAuth() {
  const router = useRouter();
  const { isLoading, session } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!session) {
        router.push('/auth?flow=login');
      } else if (!session.identity?.metadata_public?.account_id) {
        router.push('/onboarding');
      }
    }
  }, [isLoading, session, router]);

  return { isLoading, session };
}

// Hook for auth pages (login/register)
export function useRedirectIfAuthed() {
  const router = useRouter();
  const { isLoading, session } = useAuth();

  useEffect(() => {
    if (!isLoading && session?.identity?.metadata_public?.account_id) {
      router.push(`/${session.identity.metadata_public.account_id}`);
    }
  }, [isLoading, session, router]);

  return { isLoading, session };
}

// Helper to get account_id from session
export function getAccountId(session: SessionWithMetadata | null): string | null {
  return session?.identity?.metadata_public?.account_id || null;
} 