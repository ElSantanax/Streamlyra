/**
 * Middleware de Autenticación
 * Responsabilidad: Validar JWT y extraer información del usuario
 * 
 * IMPORTANTE: Diferentes plataformas tienen diferentes requisitos:
 * - Twitch, YouTube, Kick: Usan OAuth (requieren JWT para usuario)
 * - TikTok: Usa username (requiere JWT para usuario)
 * 
 * Este middleware soporta dos modos:
 * - authenticateToken: Requiere JWT válido (para rutas protegidas)
 * - optionalAuthenticate: JWT opcional (para rutas públicas con usuario opcional)
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
    // 1. Intentar desde cookies (preferido para HttpOnly)
    const tokenFromCookie = (req.cookies as Record<string, string> | undefined)?.auth_token;
    if (tokenFromCookie) return tokenFromCookie;

    // 2. Intentar desde header (fallback para compatibilidad)
    const authHeader = req.headers['authorization'];
    return authHeader?.split(' ')[1] || null;
};

/**
 * Verifica y decodifica el token JWT
 * @throws Error si el token es inválido o expirado
 */
const verifyToken = (token: string) => {
    return jwt.verify(token, config.jwtSecret) as { id: string; username: string };
};

/**
 * Middleware de autenticación requerida
 * Valida que el token JWT sea proporcionado y sea válido
 * 
 * Usado en rutas que requieren autenticación:
 * - GET /api/auth/me
 * - POST /api/auth/tiktok
 * - DELETE /api/auth/platform
 */
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

/**
 * Middleware de autenticación opcional
 * Intenta validar el token JWT si es proporcionado, pero no falla si no existe
 * 
 * Usado en rutas que soportan tanto usuarios autenticados como anónimos:
 * - POST /api/auth/twitch
 * - POST /api/auth/youtube
 * - POST /api/auth/kick
 * 
 * Esto permite que usuarios nuevos se registren sin token previo,
 * pero también permite que usuarios existentes conecten plataformas adicionales
 */
export const optionalAuthenticate = (req: AuthRequest, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (token) {
        try {
            req.user = verifyToken(token);
            logger.debug({ userId: req.user.id }, 'Token opcional verificado');
        } catch (error) {
            // Ignorar token inválido en modo opcional
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
