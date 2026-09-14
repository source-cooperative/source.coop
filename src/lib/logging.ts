import { APIError } from "./errors";
import { CONFIG } from "./config";

type LogLevel = "error" | "warn" | "info" | "debug";

interface LogContext {
  operation: string;
  context?: string;
  metadata?: Record<string, unknown>;
}

export class Logger {
  private static instance: Logger;
  private isDevelopment: boolean;
  private sensitiveValues: string[] = [];

  private constructor(isDevelopment: boolean) {
    this.isDevelopment = isDevelopment;
  }

  static getInstance(isDevelopment: boolean): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(isDevelopment);
    }
    return Logger.instance;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const { operation, context: ctx, metadata } = context;
    return `[${timestamp}] ${level.toUpperCase()} - ${operation} - ${message}${
      ctx ? ` - ${ctx}` : ""
    }${metadata ? ` - ${JSON.stringify(metadata)}` : ""}`;
  }

  private log(level: LogLevel, message: string, context: LogContext): void {
    if (level === "debug" && !this.isDevelopment) {
      return; // Skip debug logs in production
    }

    let formattedMessage = this.formatMessage(level, message, context);

    for (const sensitiveValue of this.sensitiveValues) {
      if (!sensitiveValue) continue;
      formattedMessage = formattedMessage.replace(sensitiveValue, "[REDACTED]");
    }

    switch (level) {
      case "error":
        console.error(formattedMessage);
        break;
      case "warn":
        console.warn(formattedMessage);
        break;
      case "info":
        console.info(formattedMessage);
        break;
      case "debug":
        console.log(formattedMessage); // Use console.log for debug in development
        break;
    }
  }

  error(message: string, context: LogContext & { error?: unknown }): void {
    const error = context.error
      ? context.error instanceof Error
        ? context.error
        : new Error(String(context.error))
      : null;
    const errorContext = {
      ...context,
      metadata: {
        ...context.metadata,
        error: error
          ? {
              message: error.message,
              stack: error.stack,
              code:
                context.error instanceof APIError
                  ? context.error.code
                  : undefined,
            }
          : undefined,
      },
    };
    this.log("error", message, errorContext);
  }

  warn(message: string, context: LogContext): void {
    this.log("warn", message, context);
  }

  info(message: string, context: LogContext): void {
    this.log("info", message, context);
  }

  debug(message: string, context: LogContext): void {
    this.log("debug", message, context);
  }

  registerSensitiveValue(value: string): void {
    this.sensitiveValues.push(value);
  }
}

export const LOGGER = Logger.getInstance(CONFIG.environment.isDevelopment);
LOGGER.registerSensitiveValue(CONFIG.auth.accessToken);
// A literal, not `__filename`: that is a CommonJS global, and this line runs at
// import time. Any browser bundle that reached this module -- through a server
// action, a barrel, or the uploader -- threw `__filename is not defined` before
// rendering anything, which is why so many components could not be storied.
LOGGER.debug("Loaded Config", {
  operation: "config",
  context: "src/lib/logging.ts",
  metadata: { CONFIG },
});
