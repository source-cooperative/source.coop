import {
  S3Client,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
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

export interface DeleteProgress {
  deleted: number;
  /** Objects found so far; final once `counting` is false. */
  total: number;
  counting: boolean;
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
  private batchClient: S3Client;
  private config: S3UploadConfig;
  private batchUnsupported = false;

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

    // The proxy's batch delete lives at POST /{account}/{product}?delete, one
    // segment deeper than the path-style bucket above. Moving the account into
    // the endpoint and addressing the product as the bucket builds that URL
    // with the SDK's own signing; keys in the body are product-relative.
    this.batchClient = new S3Client({
      endpoint: `${config.endpoint.replace(/\/$/, "")}/${config.bucket}`,
      region: config.region,
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

  /** DELETE one absolute object key (already includes the product prefix). */
  private async deleteKey(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key })
    );
  }

  /** Delete a single object. `key` is relative to the product prefix. */
  async deleteObject(key: string): Promise<void> {
    await this.deleteKey(`${this.config.prefix}${key}`);
  }

  /**
   * Delete every object under a prefix (relative to the product prefix),
   * reporting progress as it goes.
   *
   * Lists the whole prefix first so progress has a real total, then deletes in
   * 1000-key DeleteObjects batches — one CORS preflight and one request per
   * thousand objects instead of one of each per object. Backends without
   * DeleteObjects (GCS's XML API) reject the batch, so the first failed batch
   * switches this service to per-object DELETEs for good.
   */
  async deletePrefix(
    prefix: string,
    onProgress?: (progress: DeleteProgress) => void
  ): Promise<void> {
    const keys: string[] = [];
    let continuationToken: string | undefined;
    do {
      const listed = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: `${this.config.prefix}${prefix}`,
          ContinuationToken: continuationToken,
        })
      );
      for (const o of listed.Contents ?? []) if (o.Key) keys.push(o.Key);
      onProgress?.({ deleted: 0, total: keys.length, counting: true });
      continuationToken = listed.IsTruncated
        ? listed.NextContinuationToken
        : undefined;
    } while (continuationToken);

    let deleted = 0;
    onProgress?.({ deleted, total: keys.length, counting: false });
    for (let i = 0; i < keys.length; i += 1000) {
      const batch = keys.slice(i, i + 1000);
      await this.deleteKeys(batch, (n) => {
        deleted += n;
        onProgress?.({ deleted, total: keys.length, counting: false });
      });
    }
  }

  /** Delete up to 1000 absolute keys, batched when the backend allows it. */
  private async deleteKeys(
    keys: string[],
    onDeleted: (count: number) => void
  ): Promise<void> {
    if (!this.batchUnsupported) {
      let result;
      try {
        result = await this.batchClient.send(
          new DeleteObjectsCommand({
            Bucket: this.config.prefix.replace(/\/$/, ""),
            Delete: {
              Objects: keys.map((k) => ({
                Key: k.slice(this.config.prefix.length),
              })),
              Quiet: true,
            },
          })
        );
      } catch (error) {
        console.warn("Batch delete rejected; deleting per object", error);
        this.batchUnsupported = true;
      }
      if (result) {
        // Quiet mode lists only failures; a per-key failure is not a reason to
        // fall back, just to stop and tell the user what's left.
        const errors = result.Errors ?? [];
        onDeleted(keys.length - errors.length);
        if (errors.length) {
          throw new Error(
            `${errors.length} objects could not be deleted (${errors[0].Code}: ${errors[0].Message})`
          );
        }
        return;
      }
    }
    const CONCURRENCY = 8;
    for (let i = 0; i < keys.length; i += CONCURRENCY) {
      const chunk = keys.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map((k) => this.deleteKey(k)));
      onDeleted(chunk.length);
    }
  }
}
