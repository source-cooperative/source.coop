"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  bucket: string;
  region: string;
}

interface CredentialsContextType {
  status?: "loading" | "success" | "failed";
  fetchCredentials: () => Promise<void>;
  clearCredentials?: () => void;
  s3Credentials?: S3Credentials | null;
}

const CredentialsContext = createContext<CredentialsContextType | undefined>(
  undefined
);

export function S3CredentialsProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CredentialsContextType["status"]>();
  const [s3Credentials, setS3Credentials] = useState<S3Credentials>();

  const clearCredentials = () => setS3Credentials(undefined);

  const fetchCredentials = async () => {
    setStatus("loading");
    try {
      // Simulate fetching credentials
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStatus("success");
      setS3Credentials({
        accessKeyId: "FAKE_ACCESS_KEY_ID",
        secretAccessKey: "FAKE_SECRET_ACCESS_KEY",
        sessionToken: "FAKE_SESSION_TOKEN",
        bucket: "FAKE_BUCKET",
        region: "FAKE_REGION",
      });
    } catch (error) {
      setStatus("failed");
    }
  };
  return (
    <CredentialsContext.Provider
      value={{
        status,
        s3Credentials,
        fetchCredentials,
        clearCredentials,
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
