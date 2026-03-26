import crypto from 'crypto';
import { NextFunction, Response } from 'express';
import { AppError } from '../utils/AppError';
import { config } from '../config';
import type { AuthRequest } from './auth.middleware';
import { logger } from '../utils/logger';

const CSRF_CONFIG = {
    COOKIE_NAME: 'csrf_token',
    HEADER_NAME: 'x-csrf-token',
    AUTH_COOKIE_NAME: 'auth_token',
    SAFE_METHODS: ['GET', 'HEAD', 'OPTIONS'] as const,
    EXCLUDED_PATHS: ['/api/webhooks', '/api/auth/twitch', '/api/auth/me', '/api/auth/logout', '/api/auth/platform'],
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

    let token = getCookie(req, CSRF_CONFIG.COOKIE_NAME);

    if (!token) {
        token = generateToken();
        const cookieOptions = {
            httpOnly: false, // Permitir acceso a JS para que el cliente pueda leerlo
            secure: config.cookie.secure,
            sameSite: config.cookie.sameSite,
            domain: config.cookie.domain,
            path: '/',
            maxAge: config.cookie.maxAge
        };

        logger.debug({
            path: req.path,
            cookieOptions,
            origin: req.headers.origin,
            tokenPreview: `${token.substring(0, 10)}...`
        }, 'Setting CSRF cookie');

        res.cookie(CSRF_CONFIG.COOKIE_NAME, token, cookieOptions);
    }

    // Exponer el token en los headers para clientes cross-origin
    res.setHeader(CSRF_CONFIG.HEADER_NAME, token);

    next();
};

/**
 * Valida la coincidencia entre Cookie y Header usando comparación segura contra Timing Attacks.
 */
export const verifyCsrf = (req: AuthRequest, _res: Response, next: NextFunction): void => {
    const shouldValidate = shouldValidateCsrf(req);

    logger.debug({
        path: req.path,
        method: req.method,
        shouldValidate,
        hasAuthToken: !!getCookie(req, CSRF_CONFIG.AUTH_COOKIE_NAME),
        hasCsrfCookie: !!getCookie(req, CSRF_CONFIG.COOKIE_NAME),
        hasCsrfHeader: !!req.headers[CSRF_CONFIG.HEADER_NAME],
        cookies: Object.keys(req.cookies || {}),
        origin: req.headers.origin
    }, 'CSRF validation check');

    if (!shouldValidate) return next();

    const cookieToken = getCookie(req, CSRF_CONFIG.COOKIE_NAME);
    const headerToken = req.headers[CSRF_CONFIG.HEADER_NAME] as string | undefined;

    if (!cookieToken || !headerToken) {
        logger.warn({
            hasCookie: !!cookieToken,
            hasHeader: !!headerToken,
            cookieToken: cookieToken ? `${cookieToken.substring(0, 10)}...` : 'none',
            headerToken: headerToken ? `${headerToken.substring(0, 10)}...` : 'none',
            method: req.method,
            path: req.path,
            allCookies: Object.keys(req.cookies || {})
        }, 'CSRF token inválido o ausente');
        return next(new AppError('CSRF token inválido o ausente.', 403));
    }

    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);

    if (cookieBuffer.length !== headerBuffer.length || !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
        logger.warn({
            path: req.path,
            method: req.method
        }, 'CSRF token mismatch');
        return next(new AppError('CSRF token inválido.', 403));
    }

    next();
};