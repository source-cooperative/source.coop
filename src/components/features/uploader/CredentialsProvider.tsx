"use client";

import { LOGGER, TemporaryCredentials, getTemporaryCredentials } from "@/lib";
import {
  getProxyCredentials,
  type ProxyCredentials,
} from "@/lib/actions/proxy-credentials";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from "react";

export interface CredentialsScope {
  accountId: string;
  productId: string;
}

interface CredentialsEntry {
  credentials: TemporaryCredentials;
  status: "loading" | "success" | "failed";
  timestamp: number;
}

interface CredentialsContextType {
  getCredentials: (scope: CredentialsScope) => TemporaryCredentials | undefined;
  getStatus: (
    scope: CredentialsScope
  ) => "loading" | "success" | "failed" | undefined;
  fetchCredentials: (scope: CredentialsScope) => Promise<void>;
  clearCredentials: (scope: CredentialsScope) => void;
  clearAllCredentials: () => void;
  getAllCredentials: () => Map<CredentialsScope, TemporaryCredentials>;
  proxyCredentials: ProxyCredentials | null;
  proxyCredentialsStatus: "loading" | "success" | "failed" | undefined;
  refreshProxyCredentials: () => Promise<void>;
}

const CredentialsContext = createContext<CredentialsContextType | undefined>(
  undefined
);

export function S3CredentialsProvider({
  children,
  isAuthenticated,
}: {
  children: ReactNode;
  isAuthenticated: boolean;
}) {
  // Store credentials by scope key (accountId:productId)
  const [credentialsMap, setCredentialsMap] = useState<
    Map<string, CredentialsEntry>
  >(new Map());

  // Read credentials state (user-scoped, not product-scoped)
  const [proxyCredentials, setProxyCredentials] =
    useState<ProxyCredentials | null>(null);
  const [proxyCredentialsStatus, setProxyCredentialsStatus] = useState<
    "loading" | "success" | "failed" | undefined
  >();

  const refreshProxyCredentials = useCallback(async () => {
    setProxyCredentialsStatus("loading");
    try {
      const creds = await getProxyCredentials();
      setProxyCredentials(creds);
      setProxyCredentialsStatus("success");
    } catch (error) {
      LOGGER.error("Failed to fetch read credentials", {
        operation: "refreshProxyCredentials",
        error,
      });
      setProxyCredentials(null);
      setProxyCredentialsStatus("failed");
    }
  }, []);

  // Auto-fetch when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setProxyCredentials(null);
      setProxyCredentialsStatus(undefined);
      return;
    }
    void refreshProxyCredentials();
  }, [isAuthenticated, refreshProxyCredentials]);

  // Proactive refresh when credentials are near expiry
  useEffect(() => {
    if (!proxyCredentials) return;
    const expiresAt = new Date(proxyCredentials.expiration).getTime();
    const refreshAt = expiresAt - 5 * 60 * 1000;
    const delay = Math.max(0, refreshAt - Date.now());
    const timer = setTimeout(() => {
      void refreshProxyCredentials();
    }, delay);
    return () => clearTimeout(timer);
  }, [proxyCredentials, refreshProxyCredentials]);

  const getScopeKey = (scope: CredentialsScope): string => {
    return `${scope.accountId}:${scope.productId}`;
  };

  const getCredentials = (
    scope: CredentialsScope
  ): TemporaryCredentials | undefined => {
    const key = getScopeKey(scope);
    const entry = credentialsMap.get(key);
    return entry?.status === "success" ? entry.credentials : undefined;
  };

  const getStatus = (
    scope: CredentialsScope
  ): "loading" | "success" | "failed" | undefined => {
    const key = getScopeKey(scope);
    const entry = credentialsMap.get(key);
    return entry?.status;
  };

  const clearCredentials = (scope: CredentialsScope) => {
    const key = getScopeKey(scope);
    setCredentialsMap((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  const clearAllCredentials = () => {
    setCredentialsMap(new Map());
  };

  const credentialsMapMemo = useMemo(() => {
    const result = new Map<CredentialsScope, TemporaryCredentials>();

    credentialsMap.forEach((credentials, scopeKey) => {
      const [accountId, productId] = scopeKey.split(":");
      const scope: CredentialsScope = { accountId, productId };

      // Only include scopes with successful credentials
      if (credentials.status === "success" && credentials.credentials) {
        result.set(scope, credentials.credentials);
      }
    });

    return result;
  }, [credentialsMap]);

  const getAllCredentials = useCallback(
    () => credentialsMapMemo,
    [credentialsMapMemo]
  );

  const fetchCredentials = async (scope: CredentialsScope) => {
    const key = getScopeKey(scope);

    // Set loading status
    setCredentialsMap((prev) =>
      new Map(prev).set(key, {
        credentials: {} as TemporaryCredentials, // Placeholder
        status: "loading",
        timestamp: Date.now(),
      })
    );

    try {
      // Simulate fetching credentials for specific scope
      await new Promise((resolve) => setTimeout(resolve, 100));

      const credentials = await getTemporaryCredentials(scope);

      LOGGER.debug("Setting credentials for scope", {
        operation: "setCredentials",
        context: "credentials setting",
        metadata: { scope },
      });
      setCredentialsMap((prev) =>
        new Map(prev).set(key, {
          credentials,
          status: "success",
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      LOGGER.error("Error fetching credentials", {
        operation: "fetchCredentials",
        context: "credentials fetching",
        metadata: { scope },
        error: error,
      });
      setCredentialsMap((prev) =>
        new Map(prev).set(key, {
          credentials: {} as TemporaryCredentials, // Placeholder
          status: "failed",
          timestamp: Date.now(),
        })
      );
    }
  };

  return (
    <CredentialsContext.Provider
      value={{
        getCredentials,
        getStatus,
        fetchCredentials,
        clearCredentials,
        clearAllCredentials,
        getAllCredentials,
        proxyCredentials,
        proxyCredentialsStatus,
        refreshProxyCredentials,
      }}
    >
      {children}
    </CredentialsContext.Provider>
  );
}

export function useS3Credentials() {
  const context = useContext(CredentialsContext);
  if (context === undefined) {
    throw new Error(
      "useS3Credentials must be used within a S3CredentialsProvider"
    );
  }
  return context;
}
