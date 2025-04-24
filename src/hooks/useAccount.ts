import { useState, useEffect, useCallback } from 'react';
import { useSession } from "@ory/elements-react/client";
import { getAccountId } from "@/lib/ory";
import type { Account } from "@/types/account_v2";

export function useAccount() {
  const { session, isLoading: isAuthLoading } = useSession();
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const accountId = getAccountId(session);

  const refresh = useCallback(() => {
    setRefreshCounter((prev) => prev + 1);
  }, []);

  useEffect(() => {
    async function fetchAccount() {
      // If we're still loading auth or there's no account ID, don't make the API call
      if (isAuthLoading) {
        setAccount(null);
        setIsLoading(true);
        return;
      }

      try {
        console.log("Fetching account for ID:", accountId);
        const response = await fetch(`/api/accounts/${accountId}`, {
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch account");
        }

        const data = await response.json();
        console.log("Account data fetched:", data);
        setAccount(data);
      } catch (error) {
        console.error("Error fetching account:", error);
        setAccount(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAccount();
  }, [accountId, isAuthLoading, refreshCounter]);

  return { account, isLoading, refresh, session };
} 
