import fs from 'fs/promises';
import path from 'path';
import { StorageProvider, StorageProviderConfig, ObjectPath } from '@/types/storage';
import { Object } from '@/types/object';
import { StorageClient } from '@/types/storage';

export class LocalStorageClient implements StorageClient {
  private baseDir: string;
  private provider: StorageProvider;

  constructor(provider: StorageProvider, config: StorageProviderConfig) {
    // For local storage, endpoint should be a filesystem path
    this.baseDir = config.endpoint;
    this.provider = provider;
  }

  private getFullPath(objectPath: ObjectPath): string {
    const relativePath = `${objectPath.account_id}/${objectPath.repository_id}/${objectPath.object_path}`;
    return path.join(this.baseDir, relativePath);
  }

  async putObject(objectPath: ObjectPath, data: Buffer): Promise<Object> {
    const fullPath = this.getFullPath(objectPath);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, data);
    
    // Get file stats
    const stats = await fs.stat(fullPath);
    
    return {
      id: objectPath.object_path, // Using path as ID for now
      repository_id: objectPath.repository_id,
      path: objectPath.object_path,
      size: stats.size,
      created_at: stats.birthtime.toISOString(),
      updated_at: stats.mtime.toISOString(),
      checksum: '', // TODO: Implement checksum calculation
    };
  }

  async getObject(objectPath: ObjectPath): Promise<Buffer> {
    const fullPath = this.getFullPath(objectPath);
    return fs.readFile(fullPath);
  }

  async deleteObject(objectPath: ObjectPath): Promise<void> {
    const fullPath = this.getFullPath(objectPath);
    await fs.unlink(fullPath);
  }

  async listObjects(prefix: { account_id: string, repository_id: string }): Promise<Array<{ path: string, size: number, updated_at: string }>> {
    const basePath = path.join(this.baseDir, prefix.account_id, prefix.repository_id);
    
    try {
      const files = await this.walkDirectory(basePath);
      return files.map(file => ({
        path: path.relative(basePath, file.path),
        size: file.size,
        updated_at: file.updated_at
      }));
    } catch (error) {
      console.error('Error listing objects:', error);
      return [];
    }
  }

  private async walkDirectory(dir: string): Promise<Array<{ path: string, size: number, updated_at: string }>> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: Array<{ path: string, size: number, updated_at: string }> = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.walkDirectory(fullPath));
      } else {
        const stats = await fs.stat(fullPath);
        files.push({
          path: fullPath,
          size: stats.size,
          updated_at: stats.mtime.toISOString()
        });
      }
    }

    return files;
  }

  async getObjectInfo(objectPath: ObjectPath): Promise<{
    id?: string;
    size: number;
    created_at?: string;
    updated_at: string;
    checksum?: string;
  }> {
    const fullPath = this.getFullPath(objectPath);
    
    try {
      const stats = await fs.stat(fullPath);
      return {
        id: objectPath.object_path, // Using path as ID
        size: stats.size,
        created_at: stats.birthtime.toISOString(),
        updated_at: stats.mtime.toISOString(),
        checksum: undefined // Optional
      };
    } catch (error) {
      console.error('Error getting object info:', error);
      return null;
    }
  }
} 