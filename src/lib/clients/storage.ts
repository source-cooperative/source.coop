import { S3StorageClient } from "../storage/s3";
import { CONFIG } from "../config";
import type { StorageClient } from "@/types/storage";

function createStorageClient(): StorageClient {
  if (CONFIG.environment.debug) {
    console.log("Creating storage client with config:", CONFIG.storage);
  }

  if (!CONFIG.storage.endpoint || CONFIG.storage.endpoint.trim() === "") {
    console.error("Storage endpoint is missing in CONFIG:", CONFIG);
    throw new Error("Storage endpoint is not configured");
  }

  // Create the appropriate storage client based on type
  return new S3StorageClient({
    endpoint: CONFIG.storage.endpoint,
    region: CONFIG.storage.region,
    credentials: CONFIG.storage.credentials,
  });
}

export const storage = createStorageClient();
