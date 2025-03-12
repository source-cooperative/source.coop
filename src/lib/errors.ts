export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'INTERNAL_ERROR',
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
} 