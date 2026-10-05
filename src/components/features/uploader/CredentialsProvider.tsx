"use client";

import { LOGGER } from "@/lib/logging";
import {
  type TemporaryCredentials,
  getTemporaryCredentials,
} from "@/lib/actions/credentials";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useCallback,
  useRef,
} from "react";

// Reuse cached credentials only while they have this long left: enough for the
// upload SDK, which refreshes on its own 5 minutes before expiry, and for
// pasting them from "View Credentials" into another tool.
const MIN_REMAINING_MS = 15 * 60 * 1000;

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
  /** Warms the cache for `scope` without turning edit mode on. */
  prefetchCredentials: (scope: CredentialsScope) => void;
  fetchCredentials: (scope: CredentialsScope) => Promise<void>;
  clearCredentials: (scope: CredentialsScope) => void;
  clearAllCredentials: () => void;
  getAllCredentials: () => Map<CredentialsScope, TemporaryCredentials>;
}

const CredentialsContext = createContext<CredentialsContextType | undefined>(
  undefined
);

export function S3CredentialsProvider({ children }: { children: ReactNode }) {
  // Store credentials by scope key (accountId:productId)
  const [credentialsMap, setCredentialsMap] = useState<
    Map<string, CredentialsEntry>
  >(new Map());

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

  // Minted credentials outlive edit mode: switching to "Read Only" only drops
  // the scope from `credentialsMap`, so turning edit mode back on within the
  // hour reuses these instead of re-running the Ory + STS mint. In-flight
  // fetches are shared, so a prefetch and the click that follows it mint once.
  const cacheRef = useRef(new Map<string, TemporaryCredentials>());
  const inflightRef = useRef(new Map<string, Promise<TemporaryCredentials>>());

  const loadCredentials = (scope: CredentialsScope) => {
    const key = getScopeKey(scope);
    const cached = cacheRef.current.get(key);
    if (
      cached &&
      new Date(cached.expiration).getTime() - MIN_REMAINING_MS > Date.now()
    ) {
      return Promise.resolve(cached);
    }
    let pending = inflightRef.current.get(key);
    if (!pending) {
      pending = getTemporaryCredentials(scope)
        .then((credentials) => {
          cacheRef.current.set(key, credentials);
          return credentials;
        })
        .finally(() => inflightRef.current.delete(key));
      inflightRef.current.set(key, pending);
    }
    return pending;
  };

  // A failed prefetch is not an error yet: the click that wants the
  // credentials fetches again and reports its own failure.
  const prefetchCredentials = (scope: CredentialsScope) => {
    loadCredentials(scope).catch(() => {});
  };

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
      const credentials = await loadCredentials(scope);

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
        prefetchCredentials,
        fetchCredentials,
        clearCredentials,
        clearAllCredentials,
        getAllCredentials,
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
