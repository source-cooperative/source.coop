import { CONFIG } from "@/lib/config";
import { LOGGER } from "@/lib/logging";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  type TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { isTransactionRefused } from "./errors";
import type { GetOutputType } from "@smithy/types";
import {
  memoizedRead as defaultMemoizedRead,
  stableStringify,
  type MemoizedRead,
} from "./request-cache";

// Read commands carry their parameters on `.input`; we key the cache on the
// command class name plus a stable serialization of those parameters. The bound
// only needs those two fields — the real command output type (e.g.
// `QueryCommandOutput`) is recovered from the concrete command via
// `GetOutputType`, the same helper the client's own `send` overloads use, so
// callers keep `.Items`/`.Item` typing through the cache.
interface DynamoCommand {
  readonly input: unknown;
  readonly constructor: { name: string };
}

/** One write in a transaction, to any table. */
export type TransactItem = NonNullable<TransactWriteCommandInput["TransactItems"]>[number];

/** The most writes DynamoDB takes in one transaction. */
export const MAX_TRANSACTION_ITEMS = 100;

// Base class for database operations
export abstract class BaseTable {
  abstract model: string;
  protected readonly client: DynamoDBDocumentClient;
  private readonly memoizedRead: MemoizedRead;

  constructor({
    client,
    memoizedRead,
  }: {
    client?: DynamoDBDocumentClient;
    memoizedRead?: MemoizedRead;
  } = {}) {
    if (client) {
      this.client = client;
    } else {
      const dbClient = new DynamoDBClient(CONFIG.database);
      this.client = DynamoDBDocumentClient.from(dbClient, {
        marshallOptions: {
          removeUndefinedValues: true,
        },
      });
    }
    this.memoizedRead = memoizedRead ?? defaultMemoizedRead;
  }

  get table(): string {
    return `sc-${CONFIG.environment.stage}-${this.model}`;
  }

  /**
   * Sends a **read** command (`Get`/`Query`/`Scan`/`BatchGet`) through a
   * request-scoped memoization layer, so identical reads within a single server
   * render hit DynamoDB once. Never route writes (`Put`/`Update`/`Delete`)
   * through this.
   *
   * The resolved response is shared across callers within a request — treat it
   * as read-only and never mutate `result.Items`/`result.Item` in place.
   */
  protected cachedSend<C extends DynamoCommand>(
    command: C
  ): Promise<GetOutputType<C>> {
    const key = `${command.constructor.name}:${stableStringify(command.input)}`;
    return this.memoizedRead(key, () =>
      this.client.send(
        command as unknown as Parameters<DynamoDBDocumentClient["send"]>[0]
      )
    ) as Promise<GetOutputType<C>>;
  }

  /**
   * Applies up to MAX_TRANSACTION_ITEMS writes, to any tables, all or none.
   * Answers false, having written nothing, when a condition failed or another
   * write raced one of them.
   */
  async transact(items: TransactItem[]): Promise<boolean> {
    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: items }));
      return true;
    } catch (error) {
      if (isTransactionRefused(error)) return false;
      this.logError("transact", error, { items: items.length });
      throw error;
    }
  }

  protected logError(
    operation: string,
    error: unknown,
    context?: Record<string, unknown>
  ): void {
    LOGGER.error(`Database operation failed: ${operation}`, {
      operation: `db_${operation}`,
      context: this.table,
      metadata: context,
      error: error instanceof Error ? error : new Error(String(error)),
    });
  }
}
