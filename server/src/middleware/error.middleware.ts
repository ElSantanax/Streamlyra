/**
 * Middleware de manejo de errores - Procesa y formatea errores para respuestas HTTP
 */
import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { config } from '../config';
import { logger } from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const isAppError = err instanceof AppError;

    const statusCode = isAppError ? err.statusCode : 500;
    const message = isAppError ? err.message : 'Error interno del servidor';

    if (config.nodeEnv !== 'test') {
        if (statusCode >= 500) {
            logger.error({ err }, 'Unhandled error');
        } else {
            logger.warn({ statusCode }, message);
        }
    }

    res.status(statusCode).json({ error: message });
};
