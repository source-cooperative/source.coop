import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  type ListObjectsV2CommandInput,
} from "@aws-sdk/client-s3";
import type { ProxyCredentials } from "@/lib/actions/proxy-credentials";

export interface S3ReadClientConfig {
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

/**
 * Client-side S3 read wrapper. Two modes:
 * - Unsigned (no credentials): anonymous access to public data
 * - Signed (with credentials): authenticated access to restricted data
 */
export class S3ReadClient {
  private client: S3Client;

  constructor(config: S3ReadClientConfig) {
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
      clientConfig.signer = { sign: async (request: any) => request };
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
        lastModified: item.LastModified?.toISOString() ?? new Date().toISOString(),
      })),
      directories: (response.CommonPrefixes ?? []).map((p) => p.Prefix).filter((p): p is string => !!p),
      isTruncated: response.IsTruncated ?? false,
      nextContinuationToken: response.NextContinuationToken,
    };
  }

  async getObject(bucket: string, key: string): Promise<Uint8Array> {
    const response = await this.client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!response.Body) throw new Error("S3 response body is empty");
    return response.Body.transformToByteArray();
  }
}
