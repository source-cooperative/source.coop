import { Upload } from "@aws-sdk/lib-storage";

export type UploadStatus =
  | "queued"
  | "uploading"
  | "completed"
  | "error"
  | "cancelled";

export interface ScopedUploadItem {
  id: string;
  file: File;
  key: string;
  uploadedBytes: number;
  totalBytes: number;
  status: UploadStatus;
  error?: string;
  upload?: Upload;
  queuePosition?: number;
  scope: { accountId: string; productId: string };
}

export interface UploadQueueConfig {
  maxConcurrent?: number;
}

/**
 * Upload Queue Manager
 * Manages queuing and concurrency control for uploads
 */
export class UploadQueueManager {
  private queue: ScopedUploadItem[] = [];
  private completedUploads: ScopedUploadItem[] = [];
  private activeUploads = new Set<string>();
  private maxConcurrent: number;

  constructor(config: UploadQueueConfig = {}) {
    this.maxConcurrent = config.maxConcurrent || 5;
  }

  /**
   * Add items to the queue
   */
  enqueue(items: ScopedUploadItem[]): void {
    this.queue.push(...items);
  }

  /**
   * Get the next item from the queue
   */
  dequeue(): ScopedUploadItem | undefined {
    return this.queue.shift();
  }

  /**
   * Get items that are queued (not active, completed, or failed)
   */
  getQueuedItems(): ScopedUploadItem[] {
    return this.queue.filter((item) => item.status === "queued");
  }

  /**
   * Check if we can start a new upload (haven't reached max concurrent)
   */
  canStartUpload(): boolean {
    return this.activeUploads.size < this.maxConcurrent;
  }

  /**
   * Mark an upload as active
   */
  markActive(id: string): void {
    this.activeUploads.add(id);
    // Update the item's status to uploading using the update method
    this.updateUploadStatus(id, { status: "uploading" });
  }

  /**
   * Mark an upload as no longer active
   */
  markInactive(id: string): void {
    this.activeUploads.delete(id);
    // Note: Don't change status here as it might be completed, failed, or cancelled
  }

  /**
   * Check if an upload is currently active
   */
  isActive(id: string): boolean {
    return this.activeUploads.has(id);
  }

  /**
   * Get the number of items remaining in the queue
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get the number of active uploads
   */
  getActiveCount(): number {
    return this.activeUploads.size;
  }

  /**
   * Get all uploads (queued + completed)
   */
  getAllUploads(): ScopedUploadItem[] {
    return [...this.queue, ...this.completedUploads];
  }

  /**
   * Get upload by ID
   */
  getUpload(id: string): ScopedUploadItem | undefined {
    return this.getAllUploads().find((upload) => upload.id === id);
  }

  /**
   * Update upload status
   */
  updateUploadStatus(id: string, updates: Partial<ScopedUploadItem>): void {
    // Update in queue
    const queueIndex = this.queue.findIndex((upload) => upload.id === id);
    if (queueIndex !== -1) {
      this.queue[queueIndex] = { ...this.queue[queueIndex], ...updates };

      // Move to completed if status is completed, error, or cancelled
      if (
        updates.status === "completed" ||
        updates.status === "error" ||
        updates.status === "cancelled"
      ) {
        const completedUpload = this.queue.splice(queueIndex, 1)[0];
        this.completedUploads.push(completedUpload);
      }
    } else {
      // Update in completed uploads
      const completedIndex = this.completedUploads.findIndex(
        (upload) => upload.id === id
      );
      if (completedIndex !== -1) {
        this.completedUploads[completedIndex] = {
          ...this.completedUploads[completedIndex],
          ...updates,
        };
      }
    }
  }

  /**
   * Remove uploads by status
   */
  removeByStatus(status: UploadStatus): void {
    this.queue = this.queue.filter((upload) => upload.status !== status);
    this.completedUploads = this.completedUploads.filter(
      (upload) => upload.status !== status
    );
  }

  /**
   * Remove uploads by scope
   */
  removeByScope(scope: { accountId: string; productId: string }): void {
    this.queue = this.queue.filter(
      (upload) =>
        !(
          upload.scope?.accountId === scope.accountId &&
          upload.scope?.productId === scope.productId
        )
    );
    this.completedUploads = this.completedUploads.filter(
      (upload) =>
        !(
          upload.scope?.accountId === scope.accountId &&
          upload.scope?.productId === scope.productId
        )
    );
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.completedUploads = [];
  }

  /**
   * Get available slots for concurrent uploads
   */
  getAvailableSlots(): number {
    return Math.max(0, this.maxConcurrent - this.activeUploads.size);
  }
}
