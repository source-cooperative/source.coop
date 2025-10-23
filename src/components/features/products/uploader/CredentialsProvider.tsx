"use client";

import { LOGGER } from "@/lib";
import { createContext, useContext, useState, ReactNode, useMemo } from "react";

export interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  bucket: string;
  region: string;
}

export interface CredentialsScope {
  accountId: string;
  productId: string;
}

interface CredentialsEntry {
  credentials: S3Credentials;
  status: "loading" | "success" | "failed";
  timestamp: number;
}

interface CredentialsContextType {
  getCredentials: (scope: CredentialsScope) => S3Credentials | undefined;
  getStatus: (
    scope: CredentialsScope
  ) => "loading" | "success" | "failed" | undefined;
  fetchCredentials: (scope: CredentialsScope) => Promise<void>;
  clearCredentials: (scope: CredentialsScope) => void;
  clearAllCredentials: () => void;
  getAllCredentials: () => Map<CredentialsScope, S3Credentials>;
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
  ): S3Credentials | undefined => {
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
    const result = new Map<CredentialsScope, S3Credentials>();

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

  const getAllCredentials = () => credentialsMapMemo;

  const fetchCredentials = async (scope: CredentialsScope) => {
    const key = getScopeKey(scope);

    // Set loading status
    setCredentialsMap((prev) =>
      new Map(prev).set(key, {
        credentials: {} as S3Credentials, // Placeholder
        status: "loading",
        timestamp: Date.now(),
      })
    );

    try {
      // Simulate fetching credentials for specific scope
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // TODO: Replace with real credentials fetching logic that uses scope
      const credentials: S3Credentials = {
        accessKeyId: "MOCK_UPLOAD", // This triggers mock upload service
        secretAccessKey: `FAKE_SECRET_${scope.accountId}_${scope.productId}`,
        sessionToken: `FAKE_TOKEN_${scope.accountId}_${scope.productId}`,
        bucket: `bucket-${scope.accountId}-${scope.productId}`,
        region: "us-east-1",
      };

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
          credentials: {} as S3Credentials, // Placeholder
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
