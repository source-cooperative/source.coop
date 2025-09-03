import {
  S3Client,
  S3ServiceException,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import {
  StorageClient,
  StorageConfig,
  ListObjectsParams,
  ListObjectsResult,
  GetObjectParams,
  GetObjectResult,
  PutObjectParams,
  PutObjectResult,
  DeleteObjectParams,
  HeadObjectParams,
  HeadObjectResult,
} from "@/types/storage";
import { ProductObject } from "@/types";
import { Readable } from "stream";
import { LOGGER } from "@/lib/logging";

export class S3StorageClient implements StorageClient {
  private s3Client: S3Client;

  constructor(config: StorageConfig) {
    // Initialize S3 client without request signing for public access
    this.s3Client = new S3Client({
      ...config,
      forcePathStyle: true,
    });
  }

  async listObjects(params: ListObjectsParams): Promise<ListObjectsResult> {
    if (!params.account_id || !params.product_id) {
      LOGGER.error("Invalid params for listObjects", {
        operation: "S3StorageClient.listObjects",
        context: "parameter validation",
        metadata: { params },
      });
      return { objects: [], commonPrefixes: [], isTruncated: false };
    }

    // Ensure prefix ends with a slash if it's not empty
    const pathPrefix = params.prefix
      ? params.prefix.endsWith("/")
        ? params.prefix
        : params.prefix + "/"
      : "";

    const command = new ListObjectsV2Command({
      Bucket: params.account_id,
      Prefix: `${params.product_id}/${pathPrefix}`,
      Delimiter: params.delimiter || "/",
      MaxKeys: params.maxKeys,
      ContinuationToken: params.continuationToken,
    });

    const response = await this.s3Client.send(command);

    // Handle files (Contents)
    const objects = (response.Contents || []).map(
      (item) =>
        ({
          id: item.Key!,
          product_id: params.product_id,
          path: item.Key!.replace(`${params.product_id}/`, ""),
          size: item.Size || 0,
          type: "file",
          created_at:
            item.LastModified?.toISOString() || new Date().toISOString(),
          updated_at:
            item.LastModified?.toISOString() || new Date().toISOString(),
          checksum: item.ETag || "",
          metadata: {},
        } as ProductObject)
    );

    // Handle directories (CommonPrefixes)
    const directories = (response.CommonPrefixes || []).map((prefix) => {
      const path = prefix.Prefix!.replace(`${params.product_id}/`, "");
      return {
        id: path,
        product_id: params.product_id,
        path: path,
        size: 0,
        type: "directory",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        checksum: "",
        metadata: {},
        isDirectory: true,
      } as ProductObject;
    });

    // Combine files and directories
    const allObjects = [...objects, ...directories];

    return {
      objects: allObjects,
      commonPrefixes:
        response.CommonPrefixes?.map((prefix) =>
          prefix.Prefix!.replace(`${params.product_id}/`, "")
        ) || [],
      isTruncated: response.IsTruncated || false,
      nextContinuationToken: response.NextContinuationToken,
    };
  }

  async getObject(params: GetObjectParams): Promise<GetObjectResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: params.account_id,
        Key: `${params.product_id}/${params.object_path}`,
      });

      const response = await this.s3Client.send(command);

      // Convert stream to buffer
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
            response.LastModified?.toISOString() || new Date().toISOString(),
          updated_at:
            response.LastModified?.toISOString() || new Date().toISOString(),
          checksum: response.ETag || "",
          metadata: response.Metadata || {},
        },
        data: buffer,
        contentType: response.ContentType || "application/octet-stream",
        contentLength: buffer.length,
        etag: response.ETag || "",
        lastModified: response.LastModified || new Date(),
      };
    } catch (error) {
      LOGGER.error("Error getting object", {
        operation: "S3StorageClient.getObject",
        context: "S3 operation",
        error: error,
        metadata: { params },
      });
      throw error;
    }
  }

  async getObjectInfo(params: GetObjectParams): Promise<ProductObject | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: params.account_id,
        Key: `${params.product_id}/${params.object_path}`,
      });

      const response = await this.s3Client.send(command);

      return {
        id: params.object_path,
        product_id: params.product_id,
        path: params.object_path,
        size: response.ContentLength || 0,
        mime_type: response.ContentType || "",
        type: "file",
        created_at:
          response.LastModified?.toISOString() || new Date().toISOString(),
        updated_at:
          response.LastModified?.toISOString() || new Date().toISOString(),
        checksum: response.ETag || "",
        metadata: response.Metadata || {},
      };
    } catch (error: unknown) {
      if (error instanceof S3ServiceException && error.name === "NotFound") {
        LOGGER.debug("Object not found", {
          operation: "S3StorageClient.getObjectInfo",
          context: "S3 operation",
          metadata: {
            account_id: params.account_id,
            product_id: params.product_id,
            object_path: params.object_path,
          },
        });
        return null;
      }

      LOGGER.error("Error getting object info", {
        operation: "S3StorageClient.getObjectInfo",
        context: "S3 operation",
        error: error,
        metadata: { params },
      });
      throw error;
    }
  }

  async putObject(params: PutObjectParams): Promise<PutObjectResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: params.account_id,
        Key: `${params.product_id}/${params.object_path}`,
        Body: params.data,
        ContentType: params.contentType,
        Metadata: params.metadata,
      });

      const response = await this.s3Client.send(command);

      return {
        etag: response.ETag || "",
        versionId: response.VersionId,
      };
    } catch (error) {
      LOGGER.error("Error putting object", {
        operation: "S3StorageClient.putObject",
        context: "S3 operation",
        error: error,
        metadata: { params },
      });
      throw error;
    }
  }

  async deleteObject(params: DeleteObjectParams): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: params.account_id,
        Key: `${params.product_id}/${params.object_path}`,
        VersionId: params.versionId,
      });

      await this.s3Client.send(command);
    } catch (error) {
      LOGGER.error("Error deleting object", {
        operation: "S3StorageClient.deleteObject",
        context: "S3 operation",
        error: error,
        metadata: { params },
      });
      throw error;
    }
  }

  async headObject(params: HeadObjectParams): Promise<HeadObjectResult> {
    try {
      const command = new HeadObjectCommand({
        Bucket: params.account_id,
        Key: `${params.product_id}/${params.object_path}`,
        VersionId: params.versionId,
      });

      const response = await this.s3Client.send(command);

      return {
        etag: response.ETag,
        contentLength: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        metadata: response.Metadata,
        versionId: response.VersionId,
      };
    } catch (error: unknown) {
      if (error instanceof S3ServiceException && error.name === "NotFound") {
        LOGGER.debug("Object not found", {
          operation: "S3StorageClient.headObject",
          context: "S3 operation",
          metadata: {
            account_id: params.account_id,
            product_id: params.product_id,
            object_path: params.object_path,
          },
        });
        throw error;
      }

      LOGGER.error("Error getting object head", {
        operation: "S3StorageClient.headObject",
        context: "S3 operation",
        error: error,
        metadata: { params },
      });
      throw error;
    }
  }
}
