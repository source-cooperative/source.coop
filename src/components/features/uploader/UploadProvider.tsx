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
import { useTranslations } from "next-intl";
import { S3UploadService, type DeleteProgress } from "@/lib/services/s3-upload";
import { getTemporaryCredentials } from "@/lib/actions/credentials";
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

/** A file or folder delete running in the background. */
export interface DeleteJob extends DeleteProgress {
  id: string;
  scope: CredentialsScope;
  path: string;
  isDirectory: boolean;
  status: "deleting" | "completed" | "error";
  error?: string;
}

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
  deletions: DeleteJob[];
  hasActiveDeletions: boolean;
  /** Start a delete in the background. Resolves once it completes, rejects
      on failure; either way the job's state is in `deletions`. */
  deletePath: (
    path: string,
    isDirectory: boolean,
    scope: CredentialsScope
  ) => Promise<void>;
  dismissDeletion: (id: string) => void;
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
  const t = useTranslations("UploadProvider");
  const [uploads, setUploads] = useState<ScopedUploadItem[]>([]);
  const [deletions, setDeletions] = useState<DeleteJob[]>([]);
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
  const hasActiveDeletions = deletions.some((d) => d.status === "deleting");

  // Both run in this tab; leaving it stops them part-way.
  useBeforeUnload(
    hasActiveUploads || hasActiveDeletions,
    t("leaveWarning")
  );

  // Sync credentials to S3 services
  useEffect(() => {
    setS3Services((prev) => {
      const next = new Map(prev);
      for (const [scope, credentials] of getAllCredentials()) {
        const key = s3ServiceKey(scope);
        if (!next.has(key)) {
          // endpoint/bucket/region/prefix are stable per scope (taken from the
          // first mint); only the STS token rotates. Hand the client a provider
          // that re-mints via the server action so the SDK refreshes it before
          // expiry, keeping long uploads alive (#401).
          next.set(
            key,
            new S3UploadService({
              endpoint: credentials.endpoint,
              bucket: credentials.bucket,
              region: credentials.region,
              prefix: credentials.prefix,
              credentials: async () => {
                const c = await getTemporaryCredentials(scope);
                return {
                  accessKeyId: c.accessKeyId,
                  secretAccessKey: c.secretAccessKey,
                  sessionToken: c.sessionToken,
                  expiration: new Date(c.expiration),
                };
              },
            })
          );
        }
      }
      return next;
    });
  }, [getAllCredentials]);

  const getS3Service = (scope: CredentialsScope) => {
    return s3Services.get(s3ServiceKey(scope)) || null;
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

  const deletePath = useCallback(
    async (path: string, isDirectory: boolean, scope: CredentialsScope) => {
      const s3Service = getS3Service(scope);
      if (!s3Service)
        throw new Error(
          `No S3 service available for scope ${s3ServiceKey(scope)}`
        );
      const id = crypto.randomUUID();
      const update = (patch: Partial<DeleteJob>) =>
        setDeletions((prev) =>
          prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
        );
      // A retry of the same path replaces its earlier (failed) job.
      setDeletions((prev) => [
        ...prev.filter(
          (d) =>
            d.path !== path || s3ServiceKey(d.scope) !== s3ServiceKey(scope)
        ),
        {
          id,
          scope,
          path,
          isDirectory,
          status: "deleting",
          deleted: 0,
          total: isDirectory ? 0 : 1,
          counting: isDirectory,
        },
      ]);
      try {
        if (isDirectory) {
          await s3Service.deletePrefix(path, update);
        } else {
          await s3Service.deleteObject(path);
          update({ deleted: 1 });
        }
        update({ status: "completed" });
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : t("requestFailed");
        // A folder delete is per-batch and non-atomic, so a mid-way failure
        // leaves some objects gone and the rest intact.
        update({
          status: "error",
          error: isDirectory
            ? t("deletePartial", { reason })
            : t("deleteFailed", { reason }),
        });
        throw error;
      }
    },
    [s3Services, t]
  );

  const dismissDeletion = useCallback((id: string) => {
    setDeletions((prev) => prev.filter((d) => d.id !== id));
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
    deletions,
    hasActiveDeletions,
    deletePath,
    dismissDeletion,
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
