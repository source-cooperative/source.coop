import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import type { AwsCredentialIdentityProvider } from "@aws-sdk/types";

export interface S3UploadConfig {
  /** Data proxy endpoint. Uploads are path-style and routed through the proxy. */
  endpoint: string;
  bucket: string;
  region: string;
  prefix: string;
  /**
   * Async provider for the proxy STS credentials. Handed straight to the S3
   * client so the SDK re-invokes it ~5 min before each token's `expiration`
   * (it auto-refreshes any provider whose identity carries an `expiration`
   * Date). A static credential object would never refresh, so a multi-hour
   * upload dies the moment the first token expires — issue #401.
   */
  credentials: AwsCredentialIdentityProvider;
}

// 5MB parts, 4 concurrent — S3's minimum part size and a sensible browser
// concurrency. Inlined: no caller has ever needed to override them.
const PART_SIZE = 5 * 1024 * 1024;
const QUEUE_SIZE = 4;

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

  constructor(config: S3UploadConfig) {
    this.config = config;

    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      // The proxy addresses objects as ${endpoint}/${bucket}/${key}, matching
      // the server-side read client (S3StorageClient).
      forcePathStyle: true,
      credentials: config.credentials,
    });
  }

  /**
   * Upload a single file to S3
   */
  async uploadFile({ file, key, onProgress }: S3UploadParams): Promise<{
    upload: Upload;
    result: Promise<S3UploadResult>;
  }> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.config.bucket,
        Key: `${this.config.prefix}${key}`,
        Body: file,
        ContentType: file.type || "application/octet-stream",
      },
      queueSize: QUEUE_SIZE,
      partSize: PART_SIZE,
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
}
