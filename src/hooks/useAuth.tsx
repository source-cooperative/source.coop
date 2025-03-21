import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ory } from '@/lib/ory';
import { Session } from '@ory/client';

interface UseAuthResult {
  isLoading: boolean;
  error: Error | null;
  session: ExtendedSession | null;
}

interface SessionWithMetadata extends Session {
  identity?: {
    metadata_public?: {
      account_id?: string;
      is_admin?: boolean;
    };
  };
}

export function useAuth(): UseAuthResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [session, setSession] = useState<ExtendedSession | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data } = await ory.toSession();
        setSession(data as ExtendedSession);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to get session'));
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  return { isLoading, error, session };
}

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

// Simple hook to get session state
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    ory.toSession()
      .then(({ data }) => setSession(data))
      .catch(() => setSession(null))
      .finally(() => setIsLoading(false));
  }, []);

  return { session, isLoading };
}

// Helper to get account_id from session
export function getAccountId(session: Session | null): string | null {
  return session?.identity?.metadata_public?.['account_id'] as string || null;
} 