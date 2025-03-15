import { StorageClient, StorageProvider, StorageConfig, ObjectPath } from '@/types/storage';
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

  async putObject(objectPath: ObjectPath, data: Buffer): Promise<RepositoryObject> {
    const fullPath = this.getFullPath({
      account_id: objectPath.account_id,
      repository_id: objectPath.repository_id,
      object_path: objectPath.object_path
    });
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, data);
    
    // Get file stats
    const stats = await fs.stat(fullPath);
    
    return {
      id: objectPath.object_path,
      repository_id: objectPath.repository_id,
      path: objectPath.object_path,
      size: stats.size,
      created_at: stats.birthtime.toISOString(),
      updated_at: stats.mtime.toISOString(),
      checksum: '',
      type: 'file'
    };
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

  async getObject(params: { account_id: string; repository_id: string; path: string }): Promise<{ metadata?: Partial<RepositoryObject>; content?: string }> {
    const fullPath = this.getFullPath(params);
    try {
      // Read file content
      const content = await fs.readFile(fullPath, 'utf-8');
      const stats = await fs.stat(fullPath);
      
      // Get metadata from .source-metadata.json
      const objectMetadata = await this.getObjectMetadata({
        account_id: params.account_id,
        repository_id: params.repository_id,
        object_path: params.path
      });

      const metadata: Partial<RepositoryObject> = {
        id: params.path,
        repository_id: params.repository_id,
        path: params.path,
        size: stats.size,
        created_at: stats.birthtime.toISOString(),
        updated_at: stats.mtime.toISOString(),
        type: 'file',
        metadata: objectMetadata
      };
      
      return {
        content,
        metadata
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.error(`File not found: ${fullPath}`);
      } else {
        console.error('Error reading file:', error);
      }
      return {};
    }
  }

  async deleteObject(objectPath: ObjectPath): Promise<void> {
    const fullPath = this.getFullPath({
      account_id: objectPath.account_id,
      repository_id: objectPath.repository_id,
      object_path: objectPath.object_path
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

  async listObjects(params: { account_id: string; repository_id: string; prefix?: string }): Promise<Partial<RepositoryObject>[]> {
    if (!params.account_id || !params.repository_id) {
      console.error('Invalid params for listObjects:', params);
      return [];
    }
    
    const basePath = path.join(this.baseDir, params.account_id, params.repository_id);
    console.log('Listing objects in directory:', basePath);
    
    try {
      const files = await this.walkDirectory(basePath);
      console.log('Found files:', files);
      
      const objects = files.map(file => ({
        id: file.path,
        repository_id: params.repository_id,
        path: file.path,
        size: file.size,
        type: 'file',
        updated_at: file.updated_at,
        metadata: file.metadata
      }));
      
      console.log('Returning objects:', objects);
      return objects;
    } catch (error) {
      console.error('Error listing objects:', error);
      return [];
    }
  }

  async getObjectInfo(params: {
    account_id: string;
    repository_id: string;
    object_path: string;
  }): Promise<Partial<RepositoryObject>> {
    const fullPath = this.getFullPath(params);
    
    try {
      const stats = await fs.stat(fullPath);
      
      // Get metadata from .source-metadata.json
      const objectMetadata = await this.getObjectMetadata(params);

      return {
        id: params.object_path,
        repository_id: params.repository_id,
        path: params.object_path,
        size: stats.size,
        type: 'file',
        created_at: stats.birthtime.toISOString(),
        updated_at: stats.mtime.toISOString(),
        metadata: objectMetadata
      };
    } catch (error) {
      console.error('Error getting object info:', error);
      return {
        size: 0,
        type: 'file',
        updated_at: new Date().toISOString()
      };
    }
  }
} 