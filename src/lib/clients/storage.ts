import { S3StorageClient } from "../storage/s3";
import { CONFIG } from "../config";
import type { StorageClient, StorageConfig } from "@/types/storage";

function createStorageClient(config: StorageConfig): StorageClient {
  if (CONFIG.environment.debug) {
    console.log("Creating storage client with config:", config);
  }

  if (!config.endpoint || config.endpoint.trim() === "") {
    console.error("Storage endpoint is missing in CONFIG:", CONFIG);
    throw new Error("Storage endpoint is not configured");
  }

  // Create the appropriate storage client based on type
  return new S3StorageClient({
    endpoint: config.endpoint,
    region: config.region,
    credentials: config.credentials,
  });
}

export const storage = createStorageClient(CONFIG.storage);
