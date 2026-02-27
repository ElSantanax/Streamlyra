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
      const mockFn = jest.fn().mockResolvedValue('resultado exitoso');
      const context: ErrorContext & { action: string } = {
        action: 'test-action',
        userId: 'user123'
      };

      const result = await withErrorHandling(mockFn, context);

      expect(result).toBe('resultado exitoso');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith({ userId: 'user123' }, 'test-action started');
      expect(logger.debug).toHaveBeenCalledWith({ userId: 'user123' }, 'test-action completed');
    });

    it('debe ejecutar función con contexto completo', async () => {
      const mockFn = jest.fn().mockResolvedValue({ data: 'test' });
      const context: ErrorContext & { action: string } = {
        action: 'fetch-data',
        userId: 'user456',
        platform: 'twitch'
      };

      const result = await withErrorHandling(mockFn, context);

      expect(result).toEqual({ data: 'test' });
      expect(logger.debug).toHaveBeenCalledWith(
        { userId: 'user456', platform: 'twitch' },
        'fetch-data started'
      );
    });
  });

  describe('Casos negativos - Manejo de errores con rethrow', () => {
    it('debe loggear error y relanzarlo cuando rethrow es true', async () => {
      const error = new Error('Error de prueba');
      const mockFn = jest.fn().mockRejectedValue(error);
      const context: ErrorContext & { action: string } = {
        action: 'failing-action',
        userId: 'user789'
      };

      await expect(withErrorHandling(mockFn, context)).rejects.toThrow('Error de prueba');

      expect(logger.error).toHaveBeenCalledWith(
        { err: error, userId: 'user789' },
        'Error in failing-action'
      );
    });

    it('debe relanzar error por defecto cuando no se especifica rethrow', async () => {
      const error = new Error('Error sin opciones');
      const mockFn = jest.fn().mockRejectedValue(error);
      const context: ErrorContext & { action: string } = {
        action: 'default-action'
      };

      await expect(withErrorHandling(mockFn, context)).rejects.toThrow('Error sin opciones');
    });
  });

  describe('Casos negativos - Manejo de errores sin rethrow', () => {
    it('debe retornar undefined cuando rethrow es false', async () => {
      const error = new Error('Error silenciado');
      const mockFn = jest.fn().mockRejectedValue(error);
      const context: ErrorContext & { action: string } = {
        action: 'silent-action',
        platform: 'youtube'
      };

      const result = await withErrorHandling(mockFn, context, { rethrow: false });

      expect(result).toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(
        { err: error, platform: 'youtube' },
        'Error in silent-action'
      );
    });
  });

  describe('Edge cases - Contexto adicional', () => {
    it('debe manejar contexto con propiedades adicionales', async () => {
      const mockFn = jest.fn().mockResolvedValue(true);
      const context: ErrorContext & { action: string } = {
        action: 'complex-action',
        userId: 'user999',
        platform: 'kick',
        customField: 'custom-value',
        nested: { data: 'nested' }
      };

      await withErrorHandling(mockFn, context);

      expect(logger.debug).toHaveBeenCalledWith(
        {
          userId: 'user999',
          platform: 'kick',
          customField: 'custom-value',
          nested: { data: 'nested' }
        },
        'complex-action started'
      );
    });
  });
});
