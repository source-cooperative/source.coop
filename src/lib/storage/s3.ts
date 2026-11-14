import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  S3ServiceException,
  type ListObjectsV2CommandInput,
} from "@aws-sdk/client-s3";
import { NoAuthSigner } from "@smithy/core";
import type { Readable } from "stream";
import { LOGGER } from "@/lib/logging";
import type { ProductObject } from "@/types/product";
import type {
  GetObjectParams,
  GetObjectResult,
  HeadObjectParams,
  HeadObjectResult,
} from "@/types/storage";
import type { ProxyCredentials } from "@/lib/actions/proxy-credentials";

export interface S3StorageClientConfig {
  endpoint: string;
  credentials?: ProxyCredentials;
}

export interface ListObjectsParams {
  bucket: string;
  prefix: string;
  delimiter?: string;
  continuationToken?: string;
  maxKeys?: number;
}

export interface S3ReadObject {
  key: string;
  size: number;
  etag: string;
  lastModified: string;
}

export interface ListObjectsResult {
  objects: S3ReadObject[];
  directories: string[];
  isTruncated: boolean;
  nextContinuationToken?: string;
}

const keyFor = (p: { product_id: string; object_path: string }) =>
  `${p.product_id}/${p.object_path}`;

/**
 * True when a storage error is an S3 "AccessDenied" (HTTP 403) — i.e. the data
 * proxy refused the read. Callers use this to show a clear, recoverable notice
 * instead of falling through to the generic "something went wrong" boundary.
 */
export function isAccessDeniedError(error: unknown): boolean {
  return (
    error instanceof S3ServiceException &&
    (error.name === "AccessDenied" || error.$metadata?.httpStatusCode === 403)
  );
}

/**
 * Server-side S3 client, built per request by getStorageClient(), which wires
 * the user's proxy credentials (or anonymous for public data). Every
 * server -> proxy read therefore acts on behalf of the requesting user.
 *  - Unsigned (no credentials): anonymous access to public data
 *  - Signed (with credentials): authenticated access to restricted data
 */
export class S3StorageClient {
  private client: S3Client;

  constructor(config: S3StorageClientConfig) {
    const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
      endpoint: config.endpoint,
      region: "us-east-1",
      forcePathStyle: true,
    };
    if (config.credentials) {
      clientConfig.credentials = {
        accessKeyId: config.credentials.accessKeyId,
        secretAccessKey: config.credentials.secretAccessKey,
        sessionToken: config.credentials.sessionToken,
      };
    } else {
      // Anonymous: replace the SigV4 scheme with a no-auth signer so the SDK
      // does not resolve/sign with unrelated environment credentials.
      clientConfig.httpAuthSchemes = [
        {
          schemeId: "aws.auth#sigv4",
          identityProvider: () => async () => ({}),
          signer: new NoAuthSigner(),
        },
      ];
    }
    this.client = new S3Client(clientConfig);
  }

  async listObjects(params: ListObjectsParams): Promise<ListObjectsResult> {
    const input: ListObjectsV2CommandInput = {
      Bucket: params.bucket,
      Prefix: params.prefix,
      Delimiter: params.delimiter ?? "/",
      ContinuationToken: params.continuationToken,
      MaxKeys: params.maxKeys,
    };
    const response = await this.client.send(new ListObjectsV2Command(input));
    return {
      objects: (response.Contents ?? []).map((item) => ({
        key: item.Key ?? "",
        size: item.Size ?? 0,
        etag: item.ETag ?? "",
        lastModified:
          item.LastModified?.toISOString() ?? new Date().toISOString(),
      })),
      directories: (response.CommonPrefixes ?? [])
        .map((p) => p.Prefix)
        .filter((p): p is string => !!p),
      isTruncated: response.IsTruncated ?? false,
      nextContinuationToken: response.NextContinuationToken,
    };
  }

  /**
   * Delete every object under a prefix (e.g. a whole product's data) through
   * the proxy, paging until exhausted. Uses an unfiltered ListObjectsV2 (no
   * delimiter) so nested keys are included. Throws (naming a sample failing key
   * and reason) if any object fails, so a partial wipe can't pass for a clean one.
   *
   * Objects are deleted individually (DELETE /{bucket}/{key}) rather than via the
   * batch DeleteObjects endpoint: the proxy resolves each backend from the
   * product segment in the request path, and `POST /{bucket}?delete` carries only
   * the account in its path (keys live in the body), so the proxy rejects it with
   * "bucket not found". A per-object DELETE carries the full account/product path,
   * exactly like the read/upload calls the proxy already serves.
   */
  async deleteByPrefix(bucket: string, prefix: string): Promise<void> {
    let continuationToken: string | undefined;
    const failed: string[] = [];
    let firstReason: unknown;
    do {
      const listed = await this.client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        }),
      );
      const keys = (listed.Contents ?? [])
        .map((o) => o.Key)
        .filter((k): k is string => !!k);
      // ponytail: bounded fan-out (25) — fine for the rare product-delete path;
      // raise the chunk size if wiping huge products ever needs to be faster.
      for (let i = 0; i < keys.length; i += 25) {
        const chunk = keys.slice(i, i + 25);
        const results = await Promise.allSettled(
          chunk.map((Key) =>
            this.client.send(new DeleteObjectCommand({ Bucket: bucket, Key })),
          ),
        );
        results.forEach((r, j) => {
          if (r.status === "rejected") {
            failed.push(chunk[j]);
            firstReason ??= r.reason;
          }
        });
      }
      continuationToken = listed.IsTruncated
        ? listed.NextContinuationToken
        : undefined;
    } while (continuationToken);
    if (failed.length) {
      const detail =
        firstReason instanceof Error ? `: ${firstReason.message}` : "";
      throw new Error(`Failed to delete ${failed.length} object(s)${detail}`);
    }
  }

  /** HEAD an object. Returns null on NotFound; throws on other errors. */
  async getObjectInfo(params: GetObjectParams): Promise<ProductObject | null> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: params.account_id,
          Key: keyFor(params),
          VersionId: params.versionId,
        }),
      );
      return {
        id: params.object_path,
        product_id: params.product_id,
        path: params.object_path,
        size: response.ContentLength ?? 0,
        mime_type: response.ContentType ?? "",
        type: "file",
        created_at:
          response.LastModified?.toISOString() ?? new Date().toISOString(),
        updated_at:
          response.LastModified?.toISOString() ?? new Date().toISOString(),
        checksum: response.ETag ?? "",
        metadata: response.Metadata ?? {},
      };
    } catch (error: unknown) {
      if (error instanceof S3ServiceException && error.name === "NotFound") {
        return null;
      }
      LOGGER.error("Error getting object info", {
        operation: "S3StorageClient.getObjectInfo",
        context: "S3 operation",
        error,
        metadata: { ...params },
      });
      throw error;
    }
  }

  async headObject(params: HeadObjectParams): Promise<HeadObjectResult> {
    const response = await this.client.send(
      new HeadObjectCommand({
        Bucket: params.account_id,
        Key: keyFor(params),
        VersionId: params.versionId,
      }),
    );
    return {
      etag: response.ETag,
      contentLength: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      metadata: response.Metadata,
      versionId: response.VersionId,
    };
  }

  async getObject(params: GetObjectParams): Promise<GetObjectResult> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: params.account_id,
        Key: keyFor(params),
        Range: params.range,
      }),
    );
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as Readable) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    return {
      object: {
        id: params.object_path,
        product_id: params.product_id,
        path: params.object_path,
        size: buffer.length,
        type: "file",
        created_at:
          response.LastModified?.toISOString() ?? new Date().toISOString(),
        updated_at:
          response.LastModified?.toISOString() ?? new Date().toISOString(),
        checksum: response.ETag ?? "",
        metadata: response.Metadata ?? {},
      },
      data: buffer,
      contentType: response.ContentType ?? "application/octet-stream",
      contentLength: buffer.length,
      etag: response.ETag ?? "",
      lastModified: response.LastModified ?? new Date(),
    };
  }
}
