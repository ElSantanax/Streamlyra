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
 * Manejador global de errores. 
 * Se encarga de centralizar el logging y formatear la respuesta al cliente.
 */
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    const isAppError = err instanceof AppError;
    const isError = err instanceof Error;

    const statusCode = isAppError ? err.statusCode : 500;
    const message = isAppError ? err.message : 'Error interno del servidor';

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

    const response: ErrorResponse = { error: message };

    // Exponer stack trace únicamente en entorno de desarrollo
    if (config.nodeEnv === 'development' && isError) {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
};