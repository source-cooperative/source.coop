import type { Upload } from "@aws-sdk/lib-storage";
import type { S3UploadService } from "./s3-upload";
import type { MockS3UploadService } from "./s3-upload.mock";
import type { CredentialsScope } from "@/components/features/uploader/CredentialsProvider";

export type UploadStatus =
  | "queued"
  | "uploading"
  | "completed"
  | "error"
  | "cancelled";

export interface QueuedUpload {
  id: string;
  file: File;
  key: string;
  uploadedBytes: number;
  totalBytes: number;
  status: UploadStatus;
  error?: string;
  scope: CredentialsScope;
  s3Service: S3UploadService | MockS3UploadService;
  uploadInstance?: Upload;
}

/**
 * Simple imperative upload queue manager
 * Manages concurrent uploads and notifies React when state changes
 */
export class UploadQueueManager {
  private items: QueuedUpload[] = [];
  private activeIds = new Set<string>();
  private maxConcurrent: number;
  public onChange: () => void = () => {};

  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Add files to the upload queue
   */
  add(
    files: File[],
    prefix: string,
    scope: CredentialsScope,
    s3Service: S3UploadService | MockS3UploadService
  ) {
    const newItems: QueuedUpload[] = files.map((file, i) => ({
      id: `${Date.now()}-${i}`,
      file,
      key: prefix ? `${prefix}/${file.name}` : file.name,
      status: "queued",
      uploadedBytes: 0,
      totalBytes: file.size,
      scope,
      s3Service,
    }));

    this.items.push(...newItems);
    this.onChange();
    this.process(); // Start processing
  }

  /**
   * Cancel an upload
   */
  cancel(id: string) {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;

    item.status = "cancelled";

    // Abort if currently uploading
    if (item.uploadInstance) {
      item.uploadInstance.abort().catch((err) => {
        console.warn(`Failed to abort upload ${id}:`, err);
      });
    }

    this.activeIds.delete(id);
    this.onChange();
    this.process(); // Start next upload
  }

  /**
   * Cancel all uploads (optionally filtered by scope)
   */
  cancelAll(scope?: CredentialsScope) {
    this.items.forEach((item) => {
      if (
        scope &&
        (item.scope.accountId !== scope.accountId ||
          item.scope.productId !== scope.productId)
      ) {
        return; // Different scope, skip
      }

      if (item.status === "uploading" || item.status === "queued") {
        item.status = "cancelled";

        if (item.uploadInstance) {
          item.uploadInstance.abort().catch((err) => {
            console.warn(`Failed to abort upload ${item.id}:`, err);
          });
        }

        this.activeIds.delete(item.id);
      }
    });

    this.onChange();
    this.process();
  }

  /**
   * Retry a failed upload
   */
  async retry(id: string) {
    const item = this.items.find((i) => i.id === id);
    if (!item || item.status !== "error") return;

    item.status = "queued";
    item.uploadedBytes = 0;
    item.error = undefined;
    this.onChange();
    this.process();
  }

  /**
   * Clear uploads from queue
   */
  clear(status?: UploadStatus, scope?: CredentialsScope) {
    if (status || scope) {
      this.items = this.items.filter((item) => {
        if (
          scope &&
          (item.scope.accountId !== scope.accountId ||
            item.scope.productId !== scope.productId)
        ) {
          return true; // Keep - different scope
        }
        return status ? item.status !== status : false;
      });
    } else {
      this.items = [];
    }
    this.onChange();
  }

  /**
   * Get all uploads (returns copy for React)
   */
  getAll(): QueuedUpload[] {
    return [...this.items];
  }

  /**
   * Get uploads for a specific scope
   */
  getForScope(scope: CredentialsScope): QueuedUpload[] {
    return this.items.filter(
      (item) =>
        item.scope.accountId === scope.accountId &&
        item.scope.productId === scope.productId
    );
  }

  /**
   * Process the upload queue - fills all available slots
   */
  private process() {
    // Fill all available slots up to maxConcurrent
    while (this.activeIds.size < this.maxConcurrent) {
      const next = this.items.find((i) => i.status === "queued");
      if (!next) break; // No more queued items

      // Mark as active immediately
      this.activeIds.add(next.id);
      next.status = "uploading";
      this.onChange();

      // Start upload without awaiting (fire-and-forget for concurrency)
      this.startUpload(next);
    }
  }

  /**
   * Start a single upload
   */
  private async startUpload(item: QueuedUpload) {
    try {
      const { upload, result } = await item.s3Service.uploadFile({
        file: item.file,
        key: item.key,
        onProgress: (uploadedBytes) => {
          item.uploadedBytes = uploadedBytes;
          this.onChange();
        },
      });

      item.uploadInstance = upload;
      await result;

      item.status = "completed";
      item.uploadedBytes = item.totalBytes;
    } catch (error) {
      // Only mark as error if the upload wasn't interrupted (still uploading)
      if (item.status === "uploading") {
        item.status = "error";
        item.error = error instanceof Error ? error.message : "Upload failed";
      }
    } finally {
      this.activeIds.delete(item.id);
      item.uploadInstance = undefined;
      this.onChange();
      this.process(); // Fill the slot we just freed up
    }
  }
}
