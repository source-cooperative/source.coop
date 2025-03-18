import {
  APIError,
  StorageError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
} from './errors';

describe('APIError', () => {
  it('creates an API error with default values', () => {
    const error = new APIError('Test message', 'INTERNAL_ERROR', 500);
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.details).toBeUndefined();
  });

  it('creates an API error with custom values', () => {
    const details = { field: 'test' };
    const error = new APIError('Test message', 'CUSTOM_ERROR', 400, details);
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('CUSTOM_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual(details);
  });
});

describe('StorageError', () => {
  it('creates a storage error with default values', () => {
    const error = new StorageError('Test message', 'INTERNAL_ERROR');
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.details).toBeUndefined();
  });

  it('creates a storage error with custom values', () => {
    const details = { bucket: 'test-bucket' };
    const error = new StorageError('Test message', 'NOT_FOUND', details);
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
    expect(error.details).toEqual(details);
  });
});

describe('ValidationError', () => {
  it('creates a validation error with default values', () => {
    const error = new ValidationError('Test message');
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.details).toBeUndefined();
  });

  it('creates a validation error with custom values', () => {
    const details = { field: 'email', reason: 'invalid_format' };
    const error = new ValidationError('Test message', details);
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual(details);
  });
});

describe('AuthenticationError', () => {
  it('creates an authentication error with default values', () => {
    const error = new AuthenticationError('Test message');
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('AUTHENTICATION_ERROR');
    expect(error.statusCode).toBe(401);
    expect(error.details).toBeUndefined();
  });

  it('creates an authentication error with custom values', () => {
    const details = { reason: 'invalid_credentials' };
    const error = new AuthenticationError('Test message', details);
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('AUTHENTICATION_ERROR');
    expect(error.statusCode).toBe(401);
    expect(error.details).toEqual(details);
  });
});

describe('AuthorizationError', () => {
  it('creates an authorization error with default values', () => {
    const error = new AuthorizationError('Test message');
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('AUTHORIZATION_ERROR');
    expect(error.statusCode).toBe(403);
    expect(error.details).toBeUndefined();
  });

  it('creates an authorization error with custom values', () => {
    const details = { resource: 'repository', action: 'write' };
    const error = new AuthorizationError('Test message', details);
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('AUTHORIZATION_ERROR');
    expect(error.statusCode).toBe(403);
    expect(error.details).toEqual(details);
  });
}); 