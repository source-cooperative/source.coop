"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  UploadManager,
  UploadManagerState,
  CredentialsScope,
} from "@/lib/services/upload-manager";
import { ScopedUploadItem } from "@/lib/services/upload-queue";
import { useS3Credentials } from "./CredentialsProvider";

// Re-export types for convenience
export type { ScopedUploadItem } from "@/lib/services/upload-queue";
export type { CredentialsScope } from "@/lib/services/upload-manager";

interface UploadContextType extends UploadManagerState {
  uploadFiles: (
    files: File[],
    prefix: string,
    scope: CredentialsScope
  ) => Promise<void>;
  cancelUpload: (id: string) => Promise<void>;
  cancelAllUploads: (scope?: CredentialsScope) => Promise<void>;
  retryUpload: (id: string) => Promise<void>;
  clearCompleted: (scope?: CredentialsScope) => void;
  clearErrors: (scope?: CredentialsScope) => void;
  removeCancelled: (scope?: CredentialsScope) => void;
  clearAllUploads: (scope?: CredentialsScope) => void;
  getUploadsForScope: (scope: CredentialsScope) => ScopedUploadItem[];
  getUploadsByScope: () => Map<string, ScopedUploadItem[]>;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

interface UploadProviderProps {
  children: ReactNode;
}

export function UploadProvider({ children }: UploadProviderProps) {
  const { getAllCredentials } = useS3Credentials();
  const uploadManagerRef = useRef<UploadManager | null>(null);
  const [state, setState] = useState<UploadManagerState>({
    uploads: [],
    uploadEnabled: false,
    isUploading: false,
    hasActiveUploads: false,
    scopes: [],
  });

  // Initialize upload manager once
  useEffect(() => {
    if (!uploadManagerRef.current) {
      uploadManagerRef.current = new UploadManager();
    }

    return () => {
      if (uploadManagerRef.current) {
        uploadManagerRef.current.destroy();
        uploadManagerRef.current = null;
      }
    };
  }, []);

  // Initialize S3 services when credentials become available
  useEffect(() => {
    if (!uploadManagerRef.current) return;

    const uploadManager = uploadManagerRef.current;
    const credentialsMap = getAllCredentials();

    credentialsMap.forEach((credentials, scope) => {
      console.log({ scope, credentials });
      uploadManager.initializeS3Service(scope, credentials);
    });
  }, [getAllCredentials()]);

  // Subscribe to upload manager state changes
  useEffect(() => {
    if (!uploadManagerRef.current) return;

    const unsubscribe = uploadManagerRef.current.subscribe(setState);
    return unsubscribe;
  }, [uploadManagerRef.current]);

  // Memoized methods to prevent infinite loops
  const uploadFiles = useCallback(
    (files: File[], prefix: string, scope: CredentialsScope) =>
      uploadManagerRef.current?.uploadFiles(files, prefix, scope) ??
      Promise.resolve(),
    []
  );

  const cancelUpload = useCallback(
    (id: string) =>
      uploadManagerRef.current?.cancelUpload(id) ?? Promise.resolve(),
    []
  );

  const cancelAllUploads = useCallback(
    (scope?: CredentialsScope) =>
      uploadManagerRef.current?.cancelAllUploads(scope) ?? Promise.resolve(),
    []
  );

  const retryUpload = useCallback(
    (id: string) =>
      uploadManagerRef.current?.retryUpload(id) ?? Promise.resolve(),
    []
  );

  const clearCompleted = useCallback(
    (scope?: CredentialsScope) =>
      uploadManagerRef.current?.clearCompleted(scope),
    []
  );

  const clearErrors = useCallback(
    (scope?: CredentialsScope) => uploadManagerRef.current?.clearErrors(scope),
    []
  );

  const removeCancelled = useCallback(
    (scope?: CredentialsScope) =>
      uploadManagerRef.current?.removeCancelled(scope),
    []
  );

  const clearAllUploads = useCallback(
    (scope?: CredentialsScope) =>
      uploadManagerRef.current?.clearAllUploads(scope),
    []
  );

  const getUploadsForScope = useCallback(
    (scope: CredentialsScope): ScopedUploadItem[] =>
      uploadManagerRef.current?.getUploadsForScope(scope) ?? [],
    []
  );

  const getUploadsByScope = useCallback(
    () => uploadManagerRef.current?.getUploadsByScope() ?? new Map(),
    []
  );

  const contextValue: UploadContextType = {
    ...state,
    uploadFiles,
    cancelUpload,
    cancelAllUploads,
    retryUpload,
    clearCompleted,
    clearErrors,
    removeCancelled,
    clearAllUploads,
    getUploadsForScope,
    getUploadsByScope,
  };

  return (
    <UploadContext.Provider value={contextValue}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUploadManager() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error("useUploadManager must be used within an UploadProvider");
  }
  return context;
}
