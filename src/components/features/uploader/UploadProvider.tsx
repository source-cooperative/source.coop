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
import { S3UploadService } from "@/lib/services/s3-upload";
import { useS3Credentials } from "./CredentialsProvider";
import type { CredentialsScope } from "./CredentialsProvider";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";
import {
  UploadQueueManager,
  type QueuedUpload,
  type UploadStatus,
} from "@/lib/services/upload-queue-manager";

export type { UploadStatus, CredentialsScope };
export type ScopedUploadItem = QueuedUpload;

interface UploadContextType {
  uploads: ScopedUploadItem[];
  hasActiveUploads: boolean;
  uploadFiles: (
    files: File[],
    prefix: string,
    scope: CredentialsScope
  ) => Promise<void>;
  cancelUpload: (id: string) => Promise<void>;
  cancelAllUploads: (scope?: CredentialsScope) => Promise<void>;
  retryUpload: (id: string) => Promise<void>;
  clearUploads: (status?: UploadStatus, scope?: CredentialsScope) => void;
  clearAllUploads: (scope?: CredentialsScope) => void;
  getUploadsForScope: (scope: CredentialsScope) => ScopedUploadItem[];
  getUploadsByScope: () => Map<string, ScopedUploadItem[]>;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

interface UploadProviderProps {
  children: ReactNode;
}

const s3ServiceKey = (scope: CredentialsScope) =>
  `${scope.accountId}:${scope.productId}`;

export function UploadProvider({ children }: UploadProviderProps) {
  const { getAllCredentials } = useS3Credentials();
  const [uploads, setUploads] = useState<ScopedUploadItem[]>([]);
  const [s3Services, setS3Services] = useState<Map<string, S3UploadService>>(
    new Map()
  );

  // Create upload queue once
  const queueRef = useRef<UploadQueueManager>();
  if (!queueRef.current) {
    queueRef.current = new UploadQueueManager(5);
  }

  // Queue notifies React when it changes
  useEffect(() => {
    queueRef.current!.onChange = () => {
      setUploads(queueRef.current!.getAll());
    };
  }, []);

  // Derived state
  const activeUploads = uploads.filter(
    (u) => u.status === "uploading" || u.status === "queued"
  );
  const hasActiveUploads = activeUploads.length > 0;

  // Warn before leaving page if uploads are in progress
  useBeforeUnload(
    hasActiveUploads,
    "You have uploads in progress that will be lost if you leave."
  );

  // Sync credentials to S3 services
  useEffect(() => {
    setS3Services((prev) => {
      const next = new Map(prev);
      for (const [scope, credentials] of getAllCredentials()) {
        const key = s3ServiceKey(scope);
        if (!next.has(key)) {
          next.set(key, new S3UploadService(credentials));
        }
      }
      return next;
    });
  }, [getAllCredentials]);

  const getS3Service = (scope: CredentialsScope) => {
    const key = `${scope.accountId}:${scope.productId}`;
    return s3Services.get(key) || null;
  };

  const uploadFiles = useCallback(
    (files: File[], prefix: string, scope: CredentialsScope) => {
      if (files.length === 0) return Promise.resolve();

      const s3Service = getS3Service(scope);
      if (!s3Service) {
        console.error(
          `No S3 service available for scope ${s3ServiceKey(scope)}`
        );
        return Promise.resolve();
      }

      queueRef.current!.add(files, prefix, scope, s3Service);
      return Promise.resolve();
    },
    [s3Services]
  );

  const cancelUpload = useCallback(async (id: string) => {
    queueRef.current!.cancel(id);
  }, []);

  const cancelAllUploads = useCallback(async (scope?: CredentialsScope) => {
    queueRef.current!.cancelAll(scope);
  }, []);

  const retryUpload = useCallback(async (id: string) => {
    await queueRef.current!.retry(id);
  }, []);

  const clearUploads = useCallback(
    (status?: UploadStatus, scope?: CredentialsScope) => {
      queueRef.current!.clear(status, scope);
    },
    []
  );

  const clearAllUploads = useCallback((scope?: CredentialsScope) => {
    queueRef.current!.clear(undefined, scope);
  }, []);

  const getUploadsForScope = useCallback((scope: CredentialsScope) => {
    return queueRef.current!.getForScope(scope);
  }, []);

  const getUploadsByScope = useCallback(() => {
    const result = new Map<string, ScopedUploadItem[]>();
    uploads.forEach((upload) => {
      const key = `${upload.scope.accountId}:${upload.scope.productId}`;
      if (!result.has(key)) result.set(key, []);
      result.get(key)!.push(upload);
    });
    return result;
  }, [uploads]);

  const contextValue: UploadContextType = {
    uploads,
    hasActiveUploads,
    uploadFiles,
    cancelUpload,
    cancelAllUploads,
    retryUpload,
    clearUploads,
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
