/**
 * Middleware de protección CSRF - Genera y valida tokens CSRF para prevenir ataques
 */
import crypto from 'crypto';
import { NextFunction, Response } from 'express';
import { AppError } from '../utils/AppError';
import { config } from '../config';
import type { AuthRequest } from './auth.middleware';

/**
 * Configuración centralizada de CSRF
 */
const CSRF_CONFIG = {
    COOKIE_NAME: 'csrf_token',
    HEADER_NAME: 'x-csrf-token',
    AUTH_COOKIE_NAME: 'auth_token',
    SAFE_METHODS: ['GET', 'HEAD', 'OPTIONS'] as const,
    EXCLUDED_PATHS: ['/api/webhooks'],
    TOKEN_LENGTH: 32
} as const;

/**
 * Obtiene una cookie de forma segura con validación de tipo
 */
const getCookie = (req: AuthRequest, name: string): string | undefined => {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const value = cookies?.[name];
    return typeof value === 'string' ? value : undefined;
};

/**
 * Genera un token CSRF aleatorio
 */
const generateToken = (): string => {
    return crypto.randomBytes(CSRF_CONFIG.TOKEN_LENGTH).toString('hex');
};

/**
 * Determina si la petición requiere validación CSRF
 */
const shouldValidateCsrf = (req: AuthRequest): boolean => {
    const method = req.method.toUpperCase();
    const isMutating = !CSRF_CONFIG.SAFE_METHODS.includes(method as typeof CSRF_CONFIG.SAFE_METHODS[number]);

    if (!isMutating) return false;

    // Excluir rutas específicas (webhooks)
    if (CSRF_CONFIG.EXCLUDED_PATHS.some(path => req.path.startsWith(path))) return false;

    // Solo validar si hay token de autenticación
    if (!getCookie(req, CSRF_CONFIG.AUTH_COOKIE_NAME)) return false;

    return true;
};

/**
 * Middleware que establece la cookie CSRF si no existe
 */
export const setCsrfCookie = (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Optimización: No establecer cookies en rutas excluidas (ej: webhooks)
    if (CSRF_CONFIG.EXCLUDED_PATHS.some(path => req.path.startsWith(path))) {
        return next();
    }

    const token = getCookie(req, CSRF_CONFIG.COOKIE_NAME);

    if (!token) {
        res.cookie(CSRF_CONFIG.COOKIE_NAME, generateToken(), {
            httpOnly: false,
            secure: config.cookie.secure,
            sameSite: config.cookie.sameSite,
            domain: config.cookie.domain,
            path: '/',
            maxAge: config.cookie.maxAge
        });
    }

    next();
};

/**
 * Middleware que valida el token CSRF en peticiones mutantes
 */
export const verifyCsrf = (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!shouldValidateCsrf(req)) {
        return next();
    }

    const cookieToken = getCookie(req, CSRF_CONFIG.COOKIE_NAME);
    const headerToken = req.headers[CSRF_CONFIG.HEADER_NAME] as string | undefined;

    if (!cookieToken || !headerToken) {
        return next(new AppError('CSRF token inválido o ausente.', 403));
    }

    // Comparación segura contra timing attacks
    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);

    // Timing safe check: longitud debe ser igual y contenido idéntico
    if (cookieBuffer.length !== headerBuffer.length || !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
        return next(new AppError('CSRF token inválido.', 403));
    }

    next();
};
