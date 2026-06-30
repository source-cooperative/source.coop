import {
  S3Client,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

export interface S3UploadConfig {
  /** Data proxy endpoint. Uploads are path-style and routed through the proxy. */
  endpoint: string;
  bucket: string;
  region: string;
  prefix: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
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

  /** Delete a single object. `key` is relative to the product prefix. */
  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: `${this.config.prefix}${key}`,
      })
    );
  }

  /**
   * Delete every object under a prefix (relative to the product prefix) by
   * listing recursively and deleting in batches of up to 1000 (S3's per-request
   * cap). ponytail: page-by-page, sequential — fine for normal folders; revisit
   * only if someone deletes a prefix with millions of objects. Depends on the
   * data proxy forwarding DeleteObjects (see data-proxy-storage-access memory).
   */
  async deletePrefix(prefix: string): Promise<void> {
    const fullPrefix = `${this.config.prefix}${prefix}`;
    let continuationToken: string | undefined;
    do {
      const listed = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: fullPrefix,
          ContinuationToken: continuationToken,
        })
      );
      const objects = (listed.Contents ?? [])
        .map((o) => o.Key)
        .filter((k): k is string => !!k)
        .map((Key) => ({ Key }));
      if (objects.length > 0) {
        await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.config.bucket,
            Delete: { Objects: objects, Quiet: true },
          })
        );
      }
      continuationToken = listed.IsTruncated
        ? listed.NextContinuationToken
        : undefined;
    } while (continuationToken);
  }
}
