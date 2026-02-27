import { withErrorHandling, ErrorContext } from '../errorHandling';
import { logger } from '../logger';

jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn()
  }
}));

describe('withErrorHandling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Casos positivos - Ejecución exitosa', () => {
    it('debe ejecutar función exitosamente y retornar resultado', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const context: ErrorContext & { action: string } = {
        action: 'testAction',
        userId: 'user123'
      };

      const result = await withErrorHandling(mockFn, context);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith({ userId: 'user123' }, 'testAction started');
      expect(logger.debug).toHaveBeenCalledWith({ userId: 'user123' }, 'testAction completed');
    });

    it('debe ejecutar función con contexto completo', async () => {
      const mockFn = jest.fn().mockResolvedValue({ data: 'test' });
      const context: ErrorContext & { action: string } = {
        action: 'fetchData',
        userId: 'user456',
        platform: 'twitch'
      };

      const result = await withErrorHandling(mockFn, context);

      expect(result).toEqual({ data: 'test' });
      expect(logger.debug).toHaveBeenCalledWith(
        { userId: 'user456', platform: 'twitch' },
        'fetchData started'
      );
    });
  });

  describe('Casos negativos - Manejo de errores', () => {
    it('debe loggear error y relanzarlo cuando rethrow es true', async () => {
      const error = new Error('Test error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const context: ErrorContext & { action: string } = {
        action: 'failingAction',
        userId: 'user789'
      };

      await expect(withErrorHandling(mockFn, context)).rejects.toThrow('Test error');

      expect(logger.error).toHaveBeenCalledWith(
        { err: error, userId: 'user789' },
        'Error in failingAction'
      );
    });

    it('debe retornar undefined cuando rethrow es false', async () => {
      const error = new Error('Handled error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const context: ErrorContext & { action: string } = {
        action: 'handledAction',
        platform: 'youtube'
      };

      const result = await withErrorHandling(mockFn, context, { rethrow: false });

      expect(result).toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(
        { err: error, platform: 'youtube' },
        'Error in handledAction'
      );
    });
  });

  describe('Edge cases - Contexto mínimo', () => {
    it('debe funcionar con contexto que solo contiene action', async () => {
      const mockFn = jest.fn().mockResolvedValue(42);
      const context: ErrorContext & { action: string } = {
        action: 'minimalAction'
      };

      const result = await withErrorHandling(mockFn, context);

      expect(result).toBe(42);
      expect(logger.debug).toHaveBeenCalledWith({}, 'minimalAction started');
      expect(logger.debug).toHaveBeenCalledWith({}, 'minimalAction completed');
    });
  });
});
