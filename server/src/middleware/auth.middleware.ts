/**
 * Middleware de Autenticación - Valida JWT y extrae información del usuario
 */

import { Request, Response, NextFunction } from 'express';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
    }
}

/**
 * Extrae el token JWT de las cookies o del header Authorization
 */
const extractToken = (req: AuthRequest): string | null => {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const tokenFromCookie = typeof cookies?.auth_token === 'string' ? cookies.auth_token : null;
    if (tokenFromCookie) return tokenFromCookie;

    const authHeader = req.headers['authorization'];
    return authHeader?.split(' ')[1] || null;
};

/**
 * Verifica y decodifica el token JWT, validando su estructura
 */
const verifyToken = (token: string): { id: string; username: string } => {
    const decoded = jwt.verify(token, config.jwtSecret);

    // Validar que el payload tenga la estructura esperada
    if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
        throw new AppError('Token con estructura inválida', 401);
    }

    const payload = decoded as Record<string, unknown>;

    if (typeof payload.id !== 'string' || typeof payload.username !== 'string') {
        throw new AppError('Token con estructura inválida', 401);
    }

    return { id: payload.id, username: payload.username };
};

/**
 * Middleware que requiere autenticación válida
 */
export const authenticateToken = (req: AuthRequest, _res: Response, next: NextFunction): void => {
    try {
        const token = extractToken(req);
        if (!token) {
            logger.warn('Token no proporcionado');
            return next(new AppError('Acceso denegado. Token no proporcionado.', 401));
        }

        req.user = verifyToken(token);
        logger.debug({ userId: req.user.id }, 'Token verificado exitosamente');
        next();
    } catch (error) {
        if (error instanceof TokenExpiredError) {
            logger.warn({ expiredAt: error.expiredAt }, 'Token expirado');
            return next(new AppError('Token expirado. Por favor, inicia sesión nuevamente.', 401));
        }
        if (error instanceof JsonWebTokenError) {
            logger.warn({ message: error.message }, 'Token inválido');
            return next(new AppError('Token inválido.', 401));
        }
        if (error instanceof AppError) {
            return next(error);
        }
        logger.error({ err: error }, 'Error verificando token');
        return next(new AppError('Error al verificar token.', 500));
    }
};

/**
 * Middleware que permite autenticación opcional (no falla si no hay token)
 */
export const optionalAuthenticate = (req: AuthRequest, _res: Response, next: NextFunction): void => {
    const token = extractToken(req);
    if (token) {
        try {
            req.user = verifyToken(token);
            logger.debug({ userId: req.user.id }, 'Token opcional verificado');
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                logger.debug('Token opcional expirado, continuando sin autenticación');
            } else if (error instanceof JsonWebTokenError) {
                logger.debug({ message: (error as Error).message }, 'Token opcional inválido, continuando sin autenticación');
            } else {
                logger.debug({ err: error }, 'Error verificando token opcional, continuando sin autenticación');
            }
        }
    }
    next();
};
