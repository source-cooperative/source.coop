"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from "react";
import { S3UploadService } from "@/lib/services/s3-upload";
import { MockS3UploadService } from "@/lib/services/s3-upload.mock";
import { useS3Credentials } from "./CredentialsProvider";
import type { CredentialsScope } from "./CredentialsProvider";

// Type definitions
export type UploadStatus =
  | "queued"
  | "uploading"
  | "completed"
  | "error"
  | "cancelled";
export type { CredentialsScope };

export interface ScopedUploadItem {
  id: string;
  file: File;
  key: string;
  uploadedBytes: number;
  totalBytes: number;
  status: UploadStatus;
  error?: string;
  scope: CredentialsScope;
}

export interface UploadManagerState {
  uploads: ScopedUploadItem[];
  uploadEnabled: boolean;
  isUploading: boolean;
  hasActiveUploads: boolean;
  scopes: CredentialsScope[];
}

interface UploadContextType extends UploadManagerState {
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

export function UploadProvider({ children }: UploadProviderProps) {
  const { getAllCredentials } = useS3Credentials();
  const [uploads, setUploads] = useState<ScopedUploadItem[]>([]);
  const [s3Services, setS3Services] = useState<
    Map<string, S3UploadService | MockS3UploadService>
  >(new Map());
  const [activeUploads, setActiveUploads] = useState<Set<string>>(new Set());
  const [maxConcurrent] = useState(5);

  // Derived state
  const uploadEnabled = s3Services.size > 0;
  const isUploading = activeUploads.size > 0;
  const hasActiveUploads = activeUploads.size > 0;
  const scopes = Array.from(s3Services.keys()).map((key) => {
    const [accountId, productId] = key.split(":");
    return { accountId, productId };
  });

  // Sync credentials to S3 services
  useEffect(() => {
    const credentialsMap = getAllCredentials();
    setS3Services((prev) => {
      const next = new Map(prev);
      credentialsMap.forEach((credentials, scope) => {
        const key = `${scope.accountId}:${scope.productId}`;
        if (!next.has(key)) {
          next.set(
            key,
            credentials.accessKeyId === "MOCK_UPLOAD"
              ? new MockS3UploadService(credentials)
              : new S3UploadService(credentials)
          );
        }
      });
      return next;
    });
  }, [getAllCredentials]);

  const getS3Service = (scope: CredentialsScope) => {
    const key = `${scope.accountId}:${scope.productId}`;
    return s3Services.get(key) || null;
  };

  const updateUpload = (id: string, updates: Partial<ScopedUploadItem>) => {
    setUploads((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
  };

  const uploadFiles = useCallback(
    async (files: File[], prefix: string, scope: CredentialsScope) => {
      if (files.length === 0) return;

      const s3Service = getS3Service(scope);
      if (!s3Service) {
        console.error(
          `No S3 service available for scope ${scope.accountId}:${scope.productId}`
        );
        return;
      }

      // Create and add upload items
      const newUploads: ScopedUploadItem[] = files.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        file,
        key: `${prefix}${file.name}`,
        uploadedBytes: 0,
        totalBytes: file.size,
        status: "queued",
        scope,
      }));

      setUploads((prev) => [...prev, ...newUploads]);

      // Process uploads with concurrency control
      for (const upload of newUploads) {
        while (activeUploads.size >= maxConcurrent) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Mark as active and start upload
        setActiveUploads((prev) => new Set(prev).add(upload.id));
        updateUpload(upload.id, { status: "uploading" });

        try {
          const { promise } = await s3Service.uploadFile({
            file: upload.file,
            key: upload.key,
            onProgress: (uploadedBytes) =>
              updateUpload(upload.id, { uploadedBytes, status: "uploading" }),
          });

          await promise;
          updateUpload(upload.id, {
            status: "completed",
            uploadedBytes: upload.totalBytes,
          });
        } catch (error) {
          updateUpload(upload.id, {
            status: "error",
            error: error instanceof Error ? error.message : "Upload failed",
          });
        } finally {
          setActiveUploads((prev) => {
            const next = new Set(prev);
            next.delete(upload.id);
            return next;
          });
        }
      }
    },
    [s3Services, activeUploads.size, maxConcurrent]
  );

  const cancelUpload = useCallback(async (id: string) => {
    updateUpload(id, { status: "cancelled" });
    setActiveUploads((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const cancelAllUploads = useCallback(async (scope?: CredentialsScope) => {
    setUploads((prev) =>
      prev.map((upload) => {
        if (
          scope &&
          (upload.scope.accountId !== scope.accountId ||
            upload.scope.productId !== scope.productId)
        ) {
          return upload;
        }
        if (upload.status === "uploading" || upload.status === "queued") {
          return { ...upload, status: "cancelled" };
        }
        return upload;
      })
    );
    setActiveUploads(new Set());
  }, []);

  const retryUpload = useCallback(
    async (id: string) => {
      const upload = uploads.find((u) => u.id === id);
      if (!upload) return;

      const s3Service = getS3Service(upload.scope);
      if (!s3Service) return;

      updateUpload(id, {
        status: "queued",
        uploadedBytes: 0,
        error: undefined,
      });
      await uploadFiles(
        [upload.file],
        upload.key.replace(upload.file.name, ""),
        upload.scope
      );
    },
    [uploads, uploadFiles]
  );

  const clearUploads = useCallback(
    (status?: UploadStatus, scope?: CredentialsScope) => {
      setUploads((prev) =>
        prev.filter((upload) => {
          if (
            scope &&
            (upload.scope.accountId !== scope.accountId ||
              upload.scope.productId !== scope.productId)
          ) {
            return true;
          }
          return status ? upload.status !== status : true;
        })
      );
    },
    []
  );

  const clearAllUploads = useCallback((scope?: CredentialsScope) => {
    if (scope) {
      setUploads((prev) =>
        prev.filter(
          (upload) =>
            upload.scope.accountId !== scope.accountId ||
            upload.scope.productId !== scope.productId
        )
      );
    } else {
      setUploads([]);
    }
    setActiveUploads(new Set());
  }, []);

  const getUploadsForScope = useCallback(
    (scope: CredentialsScope) => {
      return uploads.filter(
        (upload) =>
          upload.scope.accountId === scope.accountId &&
          upload.scope.productId === scope.productId
      );
    },
    [uploads]
  );

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
    uploadEnabled,
    isUploading,
    hasActiveUploads,
    scopes,
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