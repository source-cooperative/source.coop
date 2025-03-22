import { useState, useEffect } from 'react';
import type { Account } from '@/types/account';
import { useSession } from './useAuth';
import type { Session, Identity } from '@ory/client';

interface ExtendedIdentity extends Identity {
  metadata_public?: {
    account_id?: string;
    is_admin?: boolean;
  };
}

interface SessionWithMetadata extends Session {
  identity?: ExtendedIdentity;
}

export function useAccount() {
  const { session } = useSession() as { session: SessionWithMetadata | null };
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAccount() {
      const accountId = session?.identity?.metadata_public?.account_id;
      if (!accountId) {
        setAccount(null);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/accounts/${accountId}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch account');
        }
        const data = await response.json();
        setAccount(data);
      } catch (error) {
        console.error('Error fetching account:', error);
        setAccount(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAccount();
  }, [session]);

  return { account, isLoading };
} 