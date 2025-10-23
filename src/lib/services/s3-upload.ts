import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

export interface S3UploadConfig {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  chunkSize?: number;
  maxConcurrent?: number;
}

export interface S3UploadParams {
  file: File;
  key: string;
  onProgress?: (uploadedBytes: number) => void;
}

export interface S3UploadResult {
  key: string;
  etag?: string;
}

/**
 * S3 Upload Service
 * Handles the low-level S3 upload operations
 */
export class S3UploadService {
  private client: S3Client;
  private config: S3UploadConfig;
  private chunkSize: number;
  private maxConcurrent: number;

  constructor(config: S3UploadConfig) {
    this.config = config;
    this.chunkSize = config.chunkSize || 5 * 1024 * 1024; // 5MB default
    this.maxConcurrent = config.maxConcurrent || 4;

    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        sessionToken: config.sessionToken,
      },
    });
  }

  /**
   * Upload a single file to S3
   */
  async uploadFile({ file, key, onProgress }: S3UploadParams): Promise<{
    upload: Upload;
    result: Promise<S3UploadResult>;
  }> {
    const isLargeFile = file.size > this.chunkSize;

    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.config.bucket,
        Key: key,
        Body: file,
        ContentType: file.type || "application/octet-stream",
        ...(isLargeFile && { ChecksumAlgorithm: "CRC32" }),
      },
      queueSize: this.maxConcurrent,
      partSize: this.chunkSize,
      leavePartsOnError: false,
    });

    // Attach progress handler if provided
    if (onProgress) {
      upload.on("httpUploadProgress", (progressEvent) => {
        onProgress(progressEvent.loaded || 0);
      });
    }

    return {
      upload,
      result: upload.done().then((result) => ({
        key,
        etag: result.ETag,
      })),
    };
  }

  /**
   * Cancel an upload
   */
  async cancelUpload(upload: Upload): Promise<void> {
    await upload.abort();
  }

  /**
   * Get the S3 client (for other operations if needed)
   */
  getClient(): S3Client {
    return this.client;
  }
}
