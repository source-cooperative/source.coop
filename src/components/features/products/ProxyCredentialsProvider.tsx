"use client";

import {
  getProxyCredentials,
  type ProxyCredentials,
} from "@/lib/actions/proxy-credentials";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface ProxyCredentialsContextType {
  credentials: ProxyCredentials | null;
  status: "loading" | "success" | "failed" | undefined;
  refresh: () => Promise<void>;
}

const ProxyCredentialsContext = createContext<ProxyCredentialsContextType | undefined>(undefined);

export function ProxyCredentialsProvider({
  children,
  isAuthenticated,
}: {
  children: ReactNode;
  isAuthenticated: boolean;
}) {
  const [credentials, setCredentials] = useState<ProxyCredentials | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "failed" | undefined>();

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const creds = await getProxyCredentials();
      setCredentials(creds);
      setStatus("success");
    } catch {
      setCredentials(null);
      setStatus("failed");
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setCredentials(null);
      setStatus(undefined);
      return;
    }
    void refresh();
  }, [isAuthenticated, refresh]);

  // Proactive refresh 5 minutes before expiry
  useEffect(() => {
    if (!credentials) return;
    const delay = Math.max(
      0,
      new Date(credentials.expiration).getTime() - Date.now() - 5 * 60 * 1000,
    );
    const timer = setTimeout(() => void refresh(), delay);
    return () => clearTimeout(timer);
  }, [credentials, refresh]);

  return (
    <ProxyCredentialsContext.Provider value={{ credentials, status, refresh }}>
      {children}
    </ProxyCredentialsContext.Provider>
  );
}

export function useProxyCredentials() {
  const context = useContext(ProxyCredentialsContext);
  if (!context) {
    throw new Error("useProxyCredentials must be used within ProxyCredentialsProvider");
  }
  return context;
}
