import { useState, useEffect, useCallback } from 'react';
import type { Account } from "@/types/account_v2";
import { Session } from "@ory/client-fetch";
import { useSession } from "@ory/elements-react/client";
import { ExtendedSession } from '@/types';

export function useAccount() {
  const { session, isLoading: isAuthLoading } = useSession();
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const refresh = useCallback(() => {
    setRefreshCounter(prev => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchAccount() {
      const accountId =  getAccountId(session);
      
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
  }, [getAccountId(session), isAuthLoading, refreshCounter]);

  return { account, isLoading, refresh };
} 

// Helper to get account_id from session
export function getAccountId(session: Session | null): string | null {
  return (
    (session as ExtendedSession)?.identity?.metadata_public?.account_id || null
  );
} 