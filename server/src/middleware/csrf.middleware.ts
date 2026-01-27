import crypto from 'crypto';
import { NextFunction, Response } from 'express';
import { AppError } from '../utils/AppError';
import { config } from '../config';
import type { AuthRequest } from './auth.middleware';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

export const setCsrfCookie = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = (req.cookies as Record<string, string> | undefined)?.[CSRF_COOKIE_NAME];

    if (!token) {
        res.cookie(CSRF_COOKIE_NAME, generateToken(), {
            httpOnly: false,
            secure: config.cookie.secure,
            sameSite: config.cookie.sameSite,
            domain: config.cookie.domain,
            path: '/',
        });
    }

    next();
};

export const verifyCsrf = (req: AuthRequest, _res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase();
    const isMutating = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

    if (!isMutating) return next();

    const path = req.path;
    if (path.startsWith('/api/webhooks')) return next();

    const authToken = (req.cookies as Record<string, string> | undefined)?.auth_token;
    if (!authToken) return next();

    const cookieToken = (req.cookies as Record<string, string> | undefined)?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return next(new AppError('CSRF token inválido o ausente.', 403));
    }

    next();
};
