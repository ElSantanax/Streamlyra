import { rateLimit } from 'express-rate-limit';
import { logger } from '../utils/logger';
import { config } from '../config';

const IS_TEST = config.nodeEnv === 'test';

/**
 * Limitador general para la API: 100 peticiones / 15 min.
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Demasiadas peticiones desde esta IP, por favor intenta nuevamente en 15 minutos'
    },
    handler: (req, res, _next, options) => {
        logger.warn({ ip: req.ip, path: req.path }, 'Rate limit exceeded for API');
        res.status(options.statusCode).json(options.message);
    },
    skip: (req) => {
        return IS_TEST ||
            req.originalUrl.startsWith('/api/auth') ||
            req.originalUrl.startsWith('/api/webhooks');
    }
});

/**
 * Limitador estricto para autenticación: Previene ataques de fuerza bruta.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Demasiados intentos de autenticación, por favor intenta nuevamente en 15 minutos'
    },
    handler: (req, res, _next, options) => {
        logger.warn({ ip: req.ip, path: req.path }, 'Auth rate limit exceeded');
        res.status(options.statusCode).json(options.message);
    },
    skip: () => IS_TEST
});

/**
 * Limitador para webhooks: Permite ráfagas altas de eventos (Kick/Twitch).
 */
export const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many webhook events' },
    skip: () => IS_TEST
});