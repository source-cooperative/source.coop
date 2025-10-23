import { Upload } from "@aws-sdk/lib-storage";
import type { S3UploadConfig, S3UploadParams, S3UploadResult } from "./s3-upload";

/**
 * Mock S3 Upload Service for Development
 * Simulates uploads without actually sending data to S3
 */
export class MockS3UploadService {
  private config: S3UploadConfig;

  constructor(config: S3UploadConfig) {
    this.config = config;
    console.log("🔧 Mock S3 Upload Service initialized (dev mode)");
  }

  /**
   * Simulate uploading a file
   */
  async uploadFile({
    file,
    key,
    onProgress,
  }: S3UploadParams): Promise<{
    upload: Upload;
    result: Promise<S3UploadResult>;
  }> {
    console.log(`📤 [MOCK] Starting upload: ${file.name} → ${key}`);

    // Create a fake abort controller for cancellation
    const abortController = new AbortController();
    let isCancelled = false;

    // Create a mock Upload object with abort method
    const mockUpload = {
      abort: async () => {
        isCancelled = true;
        abortController.abort();
        console.log(`❌ [MOCK] Upload cancelled: ${file.name}`);
      },
    } as Upload;

    const result = new Promise<S3UploadResult>((resolve, reject) => {
      const totalBytes = file.size;
      let uploadedBytes = 0;

      // Simulate upload progress
      const chunkSize = Math.max(1024 * 100, totalBytes / 20); // Upload in ~20 chunks
      const interval = setInterval(() => {
        if (isCancelled) {
          clearInterval(interval);
          reject(new Error("Upload cancelled"));
          return;
        }

        uploadedBytes = Math.min(uploadedBytes + chunkSize, totalBytes);

        // Call progress callback
        if (onProgress) {
          onProgress(uploadedBytes);
        }

        // Complete when done
        if (uploadedBytes >= totalBytes) {
          clearInterval(interval);
          console.log(`✅ [MOCK] Upload complete: ${file.name}`);
          resolve({
            key,
            etag: `"mock-etag-${Date.now()}"`,
          });
        }
      }, 100); // Update every 100ms

      // Listen for abort
      abortController.signal.addEventListener("abort", () => {
        clearInterval(interval);
        reject(new Error("Upload cancelled"));
      });
    });

    return { upload: mockUpload, result };
  }

  /**
   * Cancel an upload
   */
  async cancelUpload(upload: Upload): Promise<void> {
    await upload.abort();
  }

  /**
   * Get mock client (returns null since it's fake)
   */
  getClient(): null {
    return null;
  }
}
