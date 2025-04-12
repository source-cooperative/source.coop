import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { StorageClient, StorageProvider, StorageConfig, ListObjectsParams, ListObjectsResult, GetObjectParams, GetObjectResult, PutObjectParams, PutObjectResult, DeleteObjectParams } from '@/types/storage';
import { RepositoryObject } from '@/types';
import { Readable } from 'stream';

export class S3StorageClient implements StorageClient {
  private s3Client: S3Client;
  private provider: StorageProvider;

  constructor(provider: StorageProvider, config: StorageConfig) {
    console.log('S3StorageClient constructor:', { provider, config });
    
    this.provider = provider;
    
    // Initialize S3 client without request signing for public access
    this.s3Client = new S3Client({
      ...config,
      forcePathStyle: true,
    });
  }

  async listObjects(params: ListObjectsParams): Promise<ListObjectsResult> {
    if (!params.account_id || !params.repository_id) {
      console.error('Invalid params for listObjects:', params);
      return { objects: [], commonPrefixes: [], isTruncated: false };
    }

    try {
      // Ensure prefix ends with a slash if it's not empty
      const pathPrefix = params.prefix ? (params.prefix.endsWith('/') ? params.prefix : params.prefix + '/') : '';
      
      const command = new ListObjectsV2Command({
        Bucket: params.account_id,
        Prefix: `${params.repository_id}/${pathPrefix}`,
        Delimiter: params.delimiter || '/',
        MaxKeys: params.maxKeys,
        ContinuationToken: params.continuationToken,
      });

      console.log("S3 listObjects command:", command.input);

      const response = await this.s3Client.send(command);
      
      // Handle files (Contents)
      const objects = (response.Contents || []).map(item => ({
        id: item.Key!,
        repository_id: params.repository_id,
        path: item.Key!.replace(`${params.repository_id}/`, ''),
        size: item.Size || 0,
        type: 'file',
        created_at: item.LastModified?.toISOString() || new Date().toISOString(),
        updated_at: item.LastModified?.toISOString() || new Date().toISOString(),
        checksum: item.ETag || '',
        metadata: {}
      } as RepositoryObject));

      // Handle directories (CommonPrefixes)
      const directories = (response.CommonPrefixes || []).map(prefix => {
        const path = prefix.Prefix!.replace(`${params.repository_id}/`, '');
        return {
          id: path,
          repository_id: params.repository_id,
          path: path,
          size: 0,
          type: 'directory',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          checksum: '',
          metadata: {},
          isDirectory: true
        } as RepositoryObject;
      });

      // Combine files and directories
      const allObjects = [...objects, ...directories];

      console.log('S3 listObjects response:', {
        objects: allObjects.length,
        commonPrefixes: response.CommonPrefixes?.length || 0,
        isTruncated: response.IsTruncated
      });

      return {
        objects: allObjects,
        commonPrefixes: response.CommonPrefixes?.map(prefix => 
          prefix.Prefix!.replace(`${params.repository_id}/`, '')
        ) || [],
        isTruncated: response.IsTruncated || false,
        nextContinuationToken: response.NextContinuationToken
      };
    } catch (error) {
      console.error('Error listing objects:', error);
      return { objects: [], commonPrefixes: [], isTruncated: false };
    }
  }

  async getObject(params: GetObjectParams): Promise<GetObjectResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: params.account_id,
        Key: `${params.repository_id}/${params.object_path}`,
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
          repository_id: params.repository_id,
          path: params.object_path,
          size: buffer.length,
          type: 'file',
          created_at: response.LastModified?.toISOString() || new Date().toISOString(),
          updated_at: response.LastModified?.toISOString() || new Date().toISOString(),
          checksum: response.ETag || '',
          metadata: response.Metadata || {}
        },
        data: buffer,
        contentType: response.ContentType || 'application/octet-stream',
        contentLength: buffer.length,
        etag: response.ETag || '',
        lastModified: response.LastModified || new Date()
      };
    } catch (error) {
      console.error('Error getting object:', error);
      throw error;
    }
  }

  async getObjectInfo(params: GetObjectParams): Promise<RepositoryObject> {
    try {
      const command = new HeadObjectCommand({
        Bucket: params.account_id,
        Key: `${params.repository_id}/${params.object_path}`,
      });

      const response = await this.s3Client.send(command);

      return {
        id: params.object_path,
        repository_id: params.repository_id,
        path: params.object_path,
        size: response.ContentLength || 0,
        mime_type: response.ContentType || '',
        type: 'file',
        created_at: response.LastModified?.toISOString() || new Date().toISOString(),
        updated_at: response.LastModified?.toISOString() || new Date().toISOString(),
        checksum: response.ETag || '',
        metadata: response.Metadata || {}
      };
    } catch (error) {
      console.error('Error getting object info:', error);
      throw error;
    }
  }

  async putObject(params: PutObjectParams): Promise<PutObjectResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: params.account_id,
        Key: `${params.repository_id}/${params.object_path}`,
        Body: params.data,
        ContentType: params.contentType,
        Metadata: params.metadata
      });

      const response = await this.s3Client.send(command);

      return {
        etag: response.ETag || '',
        versionId: response.VersionId
      };
    } catch (error) {
      console.error('Error putting object:', error);
      throw error;
    }
  }

  async deleteObject(params: DeleteObjectParams): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: params.account_id,
        Key: `${params.repository_id}/${params.object_path}`,
        VersionId: params.versionId
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting object:', error);
      throw error;
    }
  }
} 