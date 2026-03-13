import crypto from 'crypto';
import { NextFunction, Response } from 'express';
import { AppError } from '../utils/AppError';
import { config } from '../config';
import type { AuthRequest } from './auth.middleware';

const CSRF_CONFIG = {
    COOKIE_NAME: 'csrf_token',
    HEADER_NAME: 'x-csrf-token',
    AUTH_COOKIE_NAME: 'auth_token',
    SAFE_METHODS: ['GET', 'HEAD', 'OPTIONS'] as const,
    EXCLUDED_PATHS: ['/api/webhooks'],
    TOKEN_LENGTH: 32
} as const;

const getCookie = (req: AuthRequest, name: string): string | undefined => {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const value = cookies?.[name];
    return typeof value === 'string' ? value : undefined;
};

const generateToken = (): string => {
    return crypto.randomBytes(CSRF_CONFIG.TOKEN_LENGTH).toString('hex');
};

const shouldValidateCsrf = (req: AuthRequest): boolean => {
    const method = req.method.toUpperCase();
    const isMutating = !(CSRF_CONFIG.SAFE_METHODS as readonly string[]).includes(method);

    if (!isMutating) return false;
    if (CSRF_CONFIG.EXCLUDED_PATHS.some(path => req.path.startsWith(path))) return false;

    // Solo validar si el usuario está autenticado
    return !!getCookie(req, CSRF_CONFIG.AUTH_COOKIE_NAME);
};

/**
 * Establece la cookie CSRF para que el cliente pueda leerla y enviarla en headers.
 */
export const setCsrfCookie = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (CSRF_CONFIG.EXCLUDED_PATHS.some(path => req.path.startsWith(path))) return next();

    const token = getCookie(req, CSRF_CONFIG.COOKIE_NAME);

    if (!token) {
        res.cookie(CSRF_CONFIG.COOKIE_NAME, generateToken(), {
            httpOnly: false, // Permitir acceso a JS para que el cliente pueda leerlo
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
 * Valida la coincidencia entre Cookie y Header usando comparación segura contra Timing Attacks.
 */
export const verifyCsrf = (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!shouldValidateCsrf(req)) return next();

    if (config.nodeEnv === 'production' && req.headers.origin === config.frontendUrl) {
        return next();
    }

    const cookieToken = getCookie(req, CSRF_CONFIG.COOKIE_NAME);
    const headerToken = req.headers[CSRF_CONFIG.HEADER_NAME] as string | undefined;

    if (!cookieToken || !headerToken) {
        return next(new AppError('CSRF token inválido o ausente.', 403));
    }

    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);

    if (cookieBuffer.length !== headerBuffer.length || !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
        return next(new AppError('CSRF token inválido.', 403));
    }

    next();
};