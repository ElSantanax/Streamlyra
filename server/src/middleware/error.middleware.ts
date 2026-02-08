/**
 * Middleware de manejo de errores - Procesa y formatea errores para respuestas HTTP
 */
import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { config } from '../config';
import { logger } from '../utils/logger';

interface ErrorResponse {
    error: string;
    stack?: string;
    details?: unknown;
}

/**
 * Middleware global de manejo de errores
 * Debe ser el último middleware registrado en la aplicación
 */
 
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    const isAppError = err instanceof AppError;
    const isError = err instanceof Error;

    const statusCode = isAppError ? err.statusCode : 500;
    const message = isAppError ? err.message : 'Error interno del servidor';

    // Logging mejorado con más contexto
    if (config.nodeEnv !== 'test') {
        const logData = {
            statusCode,
            message,
            ...(isError && { name: err.name }),
            ...(isAppError && { isOperational: true })
        };
        
        if (statusCode >= 500) {
            logger.error({ err, ...logData }, 'Unhandled error');
        } else {
            logger.warn(logData, message);
        }
    }

    // Construir respuesta
    const response: ErrorResponse = { error: message };

    // Incluir stack trace solo en desarrollo
    if (config.nodeEnv === 'development' && isError) {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
};
