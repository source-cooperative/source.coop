export class APIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class StorageError extends APIError {
  constructor(
    message: string,
    code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'INTERNAL_ERROR' | 'VALIDATION_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message, code, getStatusCode(code), details);
    this.name = 'StorageError';
  }
}

export class ValidationError extends APIError {
  constructor(
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends APIError {
  constructor(
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends APIError {
  constructor(
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
  }
}

function getStatusCode(code: string): number {
  switch (code) {
    case 'NOT_FOUND':
      return 404;
    case 'UNAUTHORIZED':
      return 401;
    case 'VALIDATION_ERROR':
      return 400;
    case 'INTERNAL_ERROR':
    default:
      return 500;
  }
} 