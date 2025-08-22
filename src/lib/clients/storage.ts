import { S3StorageClient } from "../storage/s3";
import { CONFIG } from "@/lib/config";
import { LOGGER } from "@/lib/logging";
import type { StorageClient, StorageConfig } from "@/types/storage";

function createStorageClient(config: StorageConfig): StorageClient {
  LOGGER.debug("Creating storage client with config", {
    operation: "createStorageClient",
    context: "storage client initialization",
    metadata: { config }
  });

  if (!config.endpoint || config.endpoint.trim() === "") {
    LOGGER.error("Storage endpoint is missing in CONFIG", {
      operation: "createStorageClient",
      context: "configuration validation",
      metadata: { CONFIG }
    });
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
