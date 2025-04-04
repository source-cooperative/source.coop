import { APIError } from './errors';
import { CONFIG } from "./config";

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  operation: string;
  context?: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private static instance: Logger;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = CONFIG.environment.isDevelopment;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: LogLevel, message: string, context: LogContext): string {
    const timestamp = new Date().toISOString();
    const { operation, context: ctx, metadata } = context;
    return `[${timestamp}] ${level.toUpperCase()} - ${operation} - ${message}${ctx ? ` - ${ctx}` : ''}${metadata ? ` - ${JSON.stringify(metadata)}` : ''}`;
  }

  private log(level: LogLevel, message: string, context: LogContext): void {
    if (level === 'debug' && !this.isDevelopment) {
      return; // Skip debug logs in production
    }

    const formattedMessage = this.formatMessage(level, message, context);
    
    switch (level) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'debug':
        console.log(formattedMessage); // Use console.log for debug in development
        break;
    }
  }

  error(message: string, context: LogContext & { error?: Error | APIError }): void {
    const errorContext = {
      ...context,
      metadata: {
        ...context.metadata,
        error: context.error ? {
          message: context.error.message,
          stack: context.error.stack,
          code: context.error instanceof APIError ? context.error.code : undefined,
        } : undefined,
      },
    };
    this.log('error', message, errorContext);
  }

  warn(message: string, context: LogContext): void {
    this.log('warn', message, context);
  }

  info(message: string, context: LogContext): void {
    this.log('info', message, context);
  }

  debug(message: string, context: LogContext): void {
    this.log('debug', message, context);
  }
}

export const logger = Logger.getInstance(); 