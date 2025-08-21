import { CONFIG } from "@/lib/config";
import { logger } from "@/lib/logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Base class for database operations
export abstract class BaseTable {
  abstract model: string;
  protected readonly client: DynamoDBDocumentClient;

  constructor({ client }: { client?: DynamoDBDocumentClient }) {
    if (client) {
      this.client = client;
    } else {
      const dbClient = new DynamoDBClient(CONFIG.database);
      this.client = DynamoDBDocumentClient.from(dbClient);
    }
  }

  get table(): string {
    return `sc-${CONFIG.environment.stage}-${this.model}`;
  }

  protected logError(
    operation: string,
    error: unknown,
    context?: Record<string, unknown>
  ): void {
    logger.error(`Database operation failed: ${operation}`, {
      operation: `db_${operation}`,
      context: this.table,
      metadata: context,
      error: error instanceof Error ? error : new Error(String(error)),
    });
  }
}
