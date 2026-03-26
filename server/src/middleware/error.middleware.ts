import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { config } from '../config';
import { logger } from '../utils/logger';

interface ErrorResponse {
    error: string;
    stack?: string;
}

/**
 * Manejador global de errores. 
 * Se encarga de centralizar el logging y formatear la respuesta al cliente.
 * 
 * SEGURIDAD: Este middleware NUNCA debe exponer información sensible al cliente.
 */
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    const isAppError = err instanceof AppError;
    const isError = err instanceof Error;

    const statusCode = isAppError ? err.statusCode : 500;
    const message = isAppError ? err.message : 'Error interno del servidor';

    // Logging interno (solo en el servidor, nunca se envía al cliente)
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

    // Respuesta al cliente (NUNCA incluir información sensible)
    const response: ErrorResponse = { error: message };

    // CRÍTICO: NO exponer stack traces en producción
    // Stack traces pueden contener rutas del servidor, variables de entorno, etc.
    if (config.nodeEnv === 'development' && isError) {
        // Sanitizar el stack trace para remover información sensible
        const sanitizedStack = err.stack
            ?.split('\n')
            .filter(line => !line.includes('DATABASE_URL') && !line.includes('JWT_SECRET'))
            .join('\n');
        response.stack = sanitizedStack;
    }

    res.status(statusCode).json(response);
};