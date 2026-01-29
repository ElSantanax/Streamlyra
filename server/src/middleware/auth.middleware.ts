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

const extractToken = (req: AuthRequest): string | null => {
    const tokenFromCookie = (req.cookies as Record<string, string> | undefined)?.auth_token;
    if (tokenFromCookie) return tokenFromCookie;

    const authHeader = req.headers['authorization'];
    return authHeader?.split(' ')[1] || null;
};

const verifyToken = (token: string) => {
    return jwt.verify(token, config.jwtSecret) as { id: string; username: string };
};

export const authenticateToken = (req: AuthRequest, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) {
        logger.warn({}, 'Token no proporcionado');
        throw new AppError('Acceso denegado. Token no proporcionado.', 401);
    }

    try {
        req.user = verifyToken(token);
        logger.debug({ userId: req.user.id }, 'Token verificado exitosamente');
        next();
    } catch (error) {
        if (error instanceof TokenExpiredError) {
            logger.warn({ expiredAt: error.expiredAt }, 'Token expirado');
            throw new AppError('Token expirado. Por favor, inicia sesión nuevamente.', 403);
        }
        if (error instanceof JsonWebTokenError) {
            logger.warn({ message: error.message }, 'Token inválido');
            throw new AppError('Token inválido.', 403);
        }
        logger.error({ err: error }, 'Error verificando token');
        throw new AppError('Error al verificar token.', 500);
    }
};

export const optionalAuthenticate = (req: AuthRequest, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (token) {
        try {
            req.user = verifyToken(token);
            logger.debug({ userId: req.user.id }, 'Token opcional verificado');
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                logger.debug({}, 'Token opcional expirado, continuando sin autenticación');
            } else if (error instanceof JsonWebTokenError) {
                logger.debug({ message: (error as Error).message }, 'Token opcional inválido, continuando sin autenticación');
            } else {
                logger.debug({ err: error }, 'Error verificando token opcional, continuando sin autenticación');
            }
        }
    }
    next();
};
