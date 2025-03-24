import { logger } from './logger';

describe('logger', () => {
  // Store original console methods
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  beforeEach(() => {
    // Mock console methods before each test
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
  });

  afterEach(() => {
    // Restore original console methods after each test
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    console.info = originalInfo;
  });

  describe('error', () => {
    it('logs error with context and metadata', () => {
      const context = {
        operation: 'test_operation',
        context: 'test_context',
        metadata: { key: 'value', error: new Error('Test error') },
      };

      logger.error('Test message', context);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] ERROR - test_operation - Test message - test_context - {"key":"value","error":{"message":"Test error","stack":.*}}/)
      );
    });

    it('handles error without metadata', () => {
      const context = {
        operation: 'test_operation',
        context: 'test_context',
        error: new Error('Test error'),
      };

      logger.error('Test message', context);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] ERROR - test_operation - Test message - test_context - {"error":{"message":"Test error","stack":.*}}/)
      );
    });

    it('handles error without error object', () => {
      const context = {
        operation: 'test_operation',
        context: 'test_context',
        metadata: { key: 'value' },
      };

      logger.error('Test message', context);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] ERROR - test_operation - Test message - test_context - {"key":"value"}/)
      );
    });
  });

  describe('warn', () => {
    it('logs warning with context and metadata', () => {
      const context = {
        operation: 'test_operation',
        context: 'test_context',
        metadata: { key: 'value' },
      };

      logger.warn('Test message', context);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] WARN - test_operation - Test message - test_context - {"key":"value"}/)
      );
    });

    it('handles warning without metadata', () => {
      const context = {
        operation: 'test_operation',
        context: 'test_context',
      };

      logger.warn('Test message', context);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] WARN - test_operation - Test message - test_context/)
      );
    });
  });

  describe('info', () => {
    it('logs info with context and metadata', () => {
      const context = {
        operation: 'test_operation',
        context: 'test_context',
        metadata: { key: 'value' },
      };

      logger.info('Test message', context);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO - test_operation - Test message - test_context - {"key":"value"}/)
      );
    });

    it('handles info without metadata', () => {
      const context = {
        operation: 'test_operation',
        context: 'test_context',
      };

      logger.info('Test message', context);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO - test_operation - Test message - test_context/)
      );
    });
  });

  describe('debug', () => {
    it('logs debug with context and metadata', () => {
      const context = {
        operation: 'test_operation',
        context: 'test_context',
        metadata: { key: 'value' },
      };

      logger.debug('Test message', context);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] DEBUG - test_operation - Test message - test_context - {"key":"value"}/)
      );
    });

    it('handles debug without metadata', () => {
      const context = {
        operation: 'test_operation',
        context: 'test_context',
      };

      logger.debug('Test message', context);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] DEBUG - test_operation - Test message - test_context/)
      );
    });
  });

  describe('log format', () => {
    it('includes timestamp in log messages', () => {
      const context = {
        operation: 'test_operation',
        context: 'test_context',
      };

      logger.info('Test message', context);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/)
      );
    });

    it('includes log level in messages', () => {
      const context = {
        operation: 'test_operation',
        context: 'test_context',
      };

      logger.error('Test message', context);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringMatching(/ERROR/)
      );

      logger.warn('Test message', context);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching(/WARN/)
      );

      logger.info('Test message', context);
      expect(console.info).toHaveBeenCalledWith(
        expect.stringMatching(/INFO/)
      );

      logger.debug('Test message', context);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/DEBUG/)
      );
    });
  });
}); 