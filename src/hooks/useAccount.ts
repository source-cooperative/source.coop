import { useState, useEffect, useCallback } from 'react';
import type { Account } from '@/types/account_v2';
import { useAuth } from './useAuth';
import type { Session, Identity } from '@ory/client';

interface ExtendedIdentity extends Identity {
  metadata_public?: {
    account_id?: string;
    is_admin?: boolean;
  };
}

interface _SessionWithMetadata extends Session {
  identity?: ExtendedIdentity;
}

export function useAccount(initialAccountId?: string | null) {
  const { session, isLoading: isAuthLoading } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const refresh = useCallback(() => {
    setRefreshCounter(prev => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchAccount() {
      const accountId = initialAccountId || session?.identity?.metadata_public?.account_id;
      
      // If we're still loading auth or there's no account ID, don't make the API call
      if (isAuthLoading || !accountId) {
        if (isMounted) {
          setAccount(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        console.log('Fetching account for ID:', accountId);
        const response = await fetch(`/api/accounts/${accountId}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch account');
        }
        
        const data = await response.json();
        console.log('Account data fetched:', data);
        if (isMounted) {
          setAccount(data);
        }
      } catch (error) {
        console.error('Error fetching account:', error);
        if (isMounted) {
          setAccount(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchAccount();

    return () => {
      isMounted = false;
    };
  }, [initialAccountId, session?.identity?.metadata_public?.account_id, isAuthLoading, refreshCounter]);

  return { account, isLoading, refresh };
} 