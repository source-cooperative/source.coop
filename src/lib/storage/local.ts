import { StorageClient, StorageProvider, StorageConfig, ObjectPath, ListObjectsParams, ListObjectsResult, GetObjectParams, GetObjectResult, PutObjectParams, PutObjectResult, DeleteObjectParams } from '@/types/storage';
import { RepositoryObject } from '@/types';
import { promises as fs } from 'fs';
import path from 'path';

export class LocalStorageClient implements StorageClient {
  private baseDir: string;
  private provider: StorageProvider;

  constructor(provider: StorageProvider, config: StorageConfig) {
    console.log('LocalStorageClient constructor:', { provider, config });
    
    if (!config?.endpoint) {
      console.error('Missing endpoint in config:', config);
      throw new Error('Storage endpoint is required for LocalStorageClient');
    }
    
    // Ensure the path is absolute
    this.baseDir = path.resolve(process.cwd(), config.endpoint);
    console.log('Resolved baseDir:', this.baseDir);
    
    this.provider = provider;
  }

  private getFullPath(params: { account_id: string; repository_id: string; path?: string; object_path?: string }): string {
    const objectPath = params.path || params.object_path || '';
    const relativePath = `${params.account_id}/${params.repository_id}/${objectPath}`;
    return path.join(this.baseDir, relativePath);
  }

  async putObject(params: PutObjectParams): Promise<PutObjectResult> {
    const fullPath = this.getFullPath({
      account_id: params.account_id,
      repository_id: params.repository_id,
      object_path: params.object_path
    });
    
    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, params.data as Buffer);
      
      const stats = await fs.stat(fullPath);
      return {
        etag: stats.mtime.getTime().toString(),
        versionId: undefined
      };
    } catch (error) {
      console.error('Error putting object:', error);
      throw error;
    }
  }

  private async getObjectMetadata(params: { account_id: string; repository_id: string; object_path: string }): Promise<any> {
    try {
      const repoPath = path.join(this.baseDir, params.account_id, params.repository_id);
      const metadataPath = path.join(repoPath, '.source-metadata.json');
      
      console.log('Looking for metadata at:', metadataPath);
      console.log('For object path:', params.object_path);
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);
      console.log('Loaded metadata:', metadata);
      console.log('Found metadata for path:', params.object_path, metadata[params.object_path]);
      
      return metadata[params.object_path] || null;
    } catch (error) {
      console.log('Error reading metadata:', error);
      // If metadata file doesn't exist or has invalid JSON, return null
      return null;
    }
  }

  async getObject(params: GetObjectParams): Promise<GetObjectResult> {
    const fullPath = this.getFullPath(params);
    
    try {
      const stats = await fs.stat(fullPath);
      const content = await fs.readFile(fullPath);
      
      // Get metadata from .source-metadata.json
      const objectMetadata = await this.getObjectMetadata({
        account_id: params.account_id,
        repository_id: params.repository_id,
        object_path: params.object_path
      });
      
      return {
        object: {
          id: params.object_path,
          repository_id: params.repository_id,
          path: params.object_path,
          size: stats.size,
          type: 'file',
          created_at: stats.birthtime.toISOString(),
          updated_at: stats.mtime.toISOString(),
          checksum: '',
          metadata: objectMetadata || {}
        },
        data: content,
        contentType: 'application/octet-stream',
        contentLength: stats.size,
        etag: stats.mtime.getTime().toString(),
        lastModified: stats.mtime
      };
    } catch (error) {
      console.error('Error getting object:', error);
      throw error;
    }
  }

  async deleteObject(params: DeleteObjectParams): Promise<void> {
    const fullPath = this.getFullPath({
      account_id: params.account_id,
      repository_id: params.repository_id,
      object_path: params.object_path
    });
    await fs.unlink(fullPath);
  }

  private async walkDirectory(
    dirPath: string,
    basePath: string = dirPath,
    repoMetadata: Record<string, any> = {}
  ): Promise<Array<{ path: string; size: number; updated_at: string; metadata?: any }>> {
    console.log('Walking directory:', dirPath);
    const files: Array<{ path: string; size: number; updated_at: string; metadata?: any }> = [];
    
    try {
      // Check if directory exists
      try {
        await fs.access(dirPath);
      } catch (error) {
        console.log('Directory does not exist:', dirPath);
        return files;
      }

      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        // Simply get the path relative to the base directory
        const relativePath = path.relative(basePath, fullPath);
        
        if (entry.isDirectory()) {
          console.log('Processing directory:', relativePath);
          const subDirFiles = await this.walkDirectory(fullPath, basePath, repoMetadata);
          files.push(...subDirFiles);
        } else if (entry.name !== '.source-metadata.json') {
          console.log('Processing file:', relativePath);
          const stats = await fs.stat(fullPath);
          
          files.push({
            path: relativePath,
            size: stats.size,
            updated_at: stats.mtime.toISOString(),
            metadata: repoMetadata[relativePath] || null
          });
        }
      }
    } catch (error) {
      console.error('Error walking directory:', error);
    }
    
    return files;
  }

  async listObjects(params: ListObjectsParams): Promise<ListObjectsResult> {
    if (!params.account_id || !params.repository_id) {
      console.error('Invalid params for listObjects:', params);
      return { objects: [], commonPrefixes: [], isTruncated: false };
    }
    
    const basePath = path.join(this.baseDir, params.account_id, params.repository_id);
    console.log('Listing objects in directory:', basePath);
    
    try {
      // Create the directory if it doesn't exist
      try {
        await fs.mkdir(basePath, { recursive: true });
      } catch (error) {
        console.error('Error creating directory:', error);
        return { objects: [], commonPrefixes: [], isTruncated: false };
      }

      const files = await this.walkDirectory(basePath);
      console.log('Found files:', files);
      
      // Filter by prefix if provided
      const filteredFiles = params.prefix 
        ? files.filter(file => file.path.startsWith(params.prefix!))
        : files;
      
      const objects = filteredFiles.map(file => ({
        id: file.path,
        repository_id: params.repository_id,
        path: file.path,
        size: file.size,
        type: file.path.endsWith('/') ? 'directory' : 'file',
        updated_at: file.updated_at,
        metadata: file.metadata || {}
      } as RepositoryObject));
      
      // Extract common prefixes (directories)
      const commonPrefixes = objects
        .filter(obj => obj.type === 'directory')
        .map(obj => obj.path);
      
      console.log('Returning objects:', objects);
      return {
        objects: objects || [],
        commonPrefixes: commonPrefixes || [],
        isTruncated: false
      };
    } catch (error) {
      console.error('Error listing objects:', error);
      return { objects: [], commonPrefixes: [], isTruncated: false };
    }
  }

  async getObjectInfo(params: GetObjectParams): Promise<RepositoryObject> {
    const fullPath = this.getFullPath(params);
    
    try {
      const stats = await fs.stat(fullPath);
      
      // Get metadata from .source-metadata.json
      const objectMetadata = await this.getObjectMetadata({
        account_id: params.account_id,
        repository_id: params.repository_id,
        object_path: params.object_path
      });

      return {
        id: params.object_path,
        repository_id: params.repository_id,
        path: params.object_path,
        size: stats.size,
        type: 'file',
        created_at: stats.birthtime.toISOString(),
        updated_at: stats.mtime.toISOString(),
        checksum: '',
        metadata: objectMetadata || {}
      };
    } catch (error) {
      console.error('Error getting object info:', error);
      throw error;
    }
  }
} 