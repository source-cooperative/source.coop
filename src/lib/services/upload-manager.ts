import { LOGGER } from "../logging";
import { S3UploadService } from "./s3-upload";
import { MockS3UploadService } from "./s3-upload.mock";
import {
  UploadQueueManager,
  ScopedUploadItem,
  UploadQueueConfig,
} from "./upload-queue";

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

export interface UploadManagerState {
  uploads: ScopedUploadItem[];
  uploadEnabled: boolean;
  isUploading: boolean;
  hasActiveUploads: boolean;
  scopes: CredentialsScope[];
}

export type UploadStateListener = (state: UploadManagerState) => void;

/**
 * Upload Manager Class
 * Manages upload state and operations independently of React lifecycle
 * Now supports multiple account/product scopes
 */
export class UploadManager {
  private listeners: Set<UploadStateListener> = new Set();
  private queue: UploadQueueManager;
  private s3Services: Map<string, S3UploadService | MockS3UploadService> =
    new Map();

  constructor(queueConfig: UploadQueueConfig = { maxConcurrent: 5 }) {
    this.queue = new UploadQueueManager(queueConfig);
  }

  /**
   * Get scope key for internal storage
   */
  private getScopeKey(scope: CredentialsScope): string {
    return `${scope.accountId}:${scope.productId}`;
  }

  /**
   * Initialize S3 service with credentials for a specific scope
   */
  initializeS3Service(
    scope: CredentialsScope,
    credentials: S3Credentials
  ): void {
    const scopeKey = this.getScopeKey(scope);
    LOGGER.debug("Initializing S3 service for scope", {
      operation: "initializeS3Service",
      context: "S3 service initialization",
      metadata: { scopeKey },
    });
    const useMockUpload = credentials.accessKeyId === "MOCK_UPLOAD";

    this.s3Services.set(
      scopeKey,
      useMockUpload
        ? new MockS3UploadService(credentials)
        : new S3UploadService(credentials)
    );

    this.notifyListeners();
  }

  /**
   * Get S3 service for a specific scope
   */
  private getS3Service(
    scope: CredentialsScope
  ): S3UploadService | MockS3UploadService | null {
    const scopeKey = this.getScopeKey(scope);
    return this.s3Services.get(scopeKey) || null;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: UploadStateListener): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.state);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current state
   */
  private get state(): UploadManagerState {
    const allUploads = this.queue.getAllUploads();
    const scopesArray = Array.from(this.s3Services.keys()).map((scopeKey) => {
      const [accountId, productId] = scopeKey.split(":");
      return { accountId, productId };
    });

    return {
      uploads: allUploads,
      uploadEnabled: this.s3Services.size > 0,
      isUploading: allUploads.some((upload) => upload.status === "uploading"),
      hasActiveUploads: allUploads.length > 0,
      scopes: scopesArray,
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    const state = this.state;
    this.listeners.forEach((listener) => listener(state));
  }

  /**
   * Process a single upload
   */
  private async processUpload(item: ScopedUploadItem): Promise<void> {
    const s3Service = this.getS3Service(item.scope);

    if (!s3Service) return;

    try {
      // Check if cancelled before starting
      const current = this.queue.getUpload(item.id);
      if (current?.status === "cancelled") {
        this.queue.markInactive(item.id);
        return;
      }

      // Update status to uploading
      this.queue.updateUploadStatus(item.id, { status: "uploading" });
      this.notifyListeners();

      // Start the upload
      const { upload, promise } = await s3Service.uploadFile({
        file: item.file,
        key: item.key,
        onProgress: (uploadedBytes) => {
          this.queue.updateUploadStatus(item.id, { uploadedBytes });
          this.notifyListeners();
        },
      });

      // Store upload instance for cancellation
      this.queue.updateUploadStatus(item.id, { upload });
      this.notifyListeners();

      // Wait for completion
      await promise;

      this.queue.updateUploadStatus(item.id, { status: "completed" });
      this.notifyListeners();
    } catch (error: any) {
      this.queue.updateUploadStatus(item.id, {
        status: "error",
        error: error.message || "Upload failed",
      });
      this.notifyListeners();
    } finally {
      this.queue.markInactive(item.id);

      // Start next upload if available
      if (this.queue.getQueueSize() > 0) {
        const nextItem = this.queue.dequeue();
        if (nextItem) {
          this.queue.markActive(nextItem.id);
          this.processUpload(nextItem);
        }
      }
    }
  }

  /**
   * Upload multiple files to a specific scope
   */
  async uploadFiles(
    files: File[],
    prefix: string,
    scope: CredentialsScope
  ): Promise<void> {
    const s3Service = this.getS3Service(scope);

    if (!s3Service) {
      console.error(
        `No S3 client available for scope ${scope.accountId}:${scope.productId}, file upload disabled`
      );
      return;
    }

    // Create scoped upload items
    const allUploads = this.queue.getAllUploads();
    const newItems: ScopedUploadItem[] = files.map((file, index) => ({
      id: `${Date.now()}-${allUploads.length + index}`,
      file,
      key: `${prefix}${file.name}`,
      uploadedBytes: 0,
      totalBytes: file.size,
      status: "queued" as const,
      queuePosition: allUploads.length + index + 1,
      scope,
    }));

    // Add to global queue
    this.queue.enqueue(newItems);
    this.notifyListeners();

    // Start processing available slots
    const availableSlots = this.queue.getAvailableSlots();
    for (let i = 0; i < availableSlots; i++) {
      const item = this.queue.dequeue();
      if (item) {
        this.queue.markActive(item.id);
        this.processUpload(item);
      }
    }
  }

  /**
   * Cancel a specific upload
   */
  async cancelUpload(id: string): Promise<void> {
    const item = this.queue.getUpload(id);
    if (item?.upload) {
      const s3Service = this.getS3Service(item.scope);
      s3Service?.cancelUpload(item.upload);
    }
    this.queue.updateUploadStatus(id, { status: "cancelled" });
    this.notifyListeners();
  }

  /**
   * Cancel all active uploads for a specific scope
   */
  async cancelAllUploads(scope?: CredentialsScope): Promise<void> {
    const allUploads = this.queue.getAllUploads();
    const uploadsToCancel = scope
      ? allUploads.filter(
          (upload) =>
            upload.scope.accountId === scope.accountId &&
            upload.scope.productId === scope.productId
        )
      : allUploads;

    uploadsToCancel.forEach((item) => {
      if (item.status === "uploading" && item.upload) {
        const s3Service = this.getS3Service(item.scope);
        s3Service?.cancelUpload(item.upload);
      }
    });

    // Cancel uploads in the queue manager
    uploadsToCancel.forEach((item) => {
      if (item.status === "uploading" || item.status === "queued") {
        this.queue.updateUploadStatus(item.id, { status: "cancelled" });
      }
    });

    // Clear the global queue
    this.queue.clear();
    this.notifyListeners();
  }

  /**
   * Retry a failed upload
   */
  async retryUpload(id: string): Promise<void> {
    const item = this.queue.getUpload(id);
    if (!item || item.status !== "error") return;

    const resetItem: ScopedUploadItem = {
      ...item,
      status: "queued",
      uploadedBytes: 0,
      error: undefined,
      upload: undefined,
    };

    this.queue.updateUploadStatus(id, resetItem);
    this.queue.enqueue([resetItem]);
    this.notifyListeners();

    if (this.queue.canStartUpload()) {
      const nextItem = this.queue.dequeue();
      if (nextItem) {
        this.queue.markActive(nextItem.id);
        this.processUpload(nextItem);
      }
    }
  }

  /**
   * Clear completed uploads from list (optionally for a specific scope)
   */
  clearCompleted(scope?: CredentialsScope): void {
    if (scope) {
      this.queue.removeByScope(scope);
    } else {
      this.queue.removeByStatus("completed");
    }
    this.notifyListeners();
  }

  /**
   * Clear error uploads from list (optionally for a specific scope)
   */
  clearErrors(scope?: CredentialsScope): void {
    if (scope) {
      this.queue.removeByScope(scope);
    } else {
      this.queue.removeByStatus("error");
    }
    this.notifyListeners();
  }

  /**
   * Remove cancelled uploads from list (optionally for a specific scope)
   */
  removeCancelled(scope?: CredentialsScope): void {
    if (scope) {
      this.queue.removeByScope(scope);
    } else {
      this.queue.removeByStatus("cancelled");
    }
    this.notifyListeners();
  }

  /**
   * Clear all uploads (optionally for a specific scope)
   */
  clearAllUploads(scope?: CredentialsScope): void {
    if (scope) {
      this.queue.removeByScope(scope);
    } else {
      this.queue.clear();
    }
    this.notifyListeners();
  }

  /**
   * Get uploads for a specific scope
   */
  getUploadsForScope(scope: CredentialsScope): ScopedUploadItem[] {
    const allUploads = this.queue.getAllUploads();
    return allUploads.filter(
      (upload) =>
        upload.scope?.accountId === scope.accountId &&
        upload.scope?.productId === scope.productId
    );
  }

  /**
   * Get uploads grouped by scope
   */
  getUploadsByScope(): Map<string, ScopedUploadItem[]> {
    const allUploads = this.queue.getAllUploads();
    const grouped = new Map<string, ScopedUploadItem[]>();

    allUploads.forEach((upload) => {
      const scopeKey = this.getScopeKey(upload.scope);
      if (!grouped.has(scopeKey)) {
        grouped.set(scopeKey, []);
      }
      grouped.get(scopeKey)!.push(upload);
    });

    return grouped;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.listeners.clear();
    this.queue.clear();
    this.s3Services.clear();
  }
}
