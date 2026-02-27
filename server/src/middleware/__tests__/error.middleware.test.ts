import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../error.middleware';
import { AppError } from '../../utils/AppError';
import { config } from '../../config';
import { logger } from '../../utils/logger';

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../config', () => ({
  config: {
    nodeEnv: 'test'
  }
}));

describe('errorHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {};
    mockResponse = {
      status: statusMock
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('Casos positivos - AppError', () => {
    it('debe manejar AppError con statusCode y mensaje personalizados', () => {
      const error = new AppError('Usuario no encontrado', 404);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Usuario no encontrado' });
    });

    it('debe manejar AppError con statusCode 400', () => {
      const error = new AppError('Datos inválidos', 400);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Datos inválidos' });
    });
  });

  describe('Casos negativos - Errores genéricos', () => {
    it('debe manejar Error genérico con statusCode 500 y mensaje por defecto', () => {
      const error = new Error('Error inesperado');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
    });

    it('debe manejar errores no-Error con statusCode 500', () => {
      const error = 'String error';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
    });
  });

  describe('Logging según entorno', () => {
    it('no debe loggear cuando nodeEnv es test', () => {
      const error = new AppError('Test error', 400);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('debe loggear error cuando statusCode >= 500 y no es test', () => {
      (config as { nodeEnv: string }).nodeEnv = 'production';
      const error = new AppError('Error crítico', 500);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: error,
          statusCode: 500,
          message: 'Error crítico',
          name: 'Error',
          isOperational: true
        }),
        'Unhandled error'
      );

      (config as { nodeEnv: string }).nodeEnv = 'test';
    });

    it('debe loggear warning cuando statusCode < 500 y no es test', () => {
      (config as { nodeEnv: string }).nodeEnv = 'production';
      const error = new AppError('Recurso no encontrado', 404);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Recurso no encontrado',
          name: 'Error',
          isOperational: true
        }),
        'Recurso no encontrado'
      );

      (config as { nodeEnv: string }).nodeEnv = 'test';
    });
  });

  describe('Stack trace en desarrollo', () => {
    it('debe incluir stack trace cuando nodeEnv es development', () => {
      (config as { nodeEnv: string }).nodeEnv = 'development';
      const error = new Error('Error de desarrollo');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Error interno del servidor',
        stack: error.stack
      });

      (config as { nodeEnv: string }).nodeEnv = 'test';
    });

    it('no debe incluir stack trace cuando nodeEnv no es development', () => {
      const error = new Error('Error de producción');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Error interno del servidor'
      });
      expect(jsonMock).toHaveBeenCalledTimes(1);
    });
  });
});
