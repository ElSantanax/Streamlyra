import { rateLimit } from 'express-rate-limit';
import { logger } from '../utils/logger';
import { config } from '../config';

/**
 * Limitador general para la API
 * Permite 100 peticiones cada 15 minutos por IP
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 100, // Límite de 100 peticiones por ventana
    standardHeaders: true, // Retorna info de rate limit en los headers `RateLimit-*`
    legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*`
    message: {
        error: 'Demasiadas peticiones desde esta IP, por favor intenta nuevamente en 15 minutos'
    },
    handler: (req, res, next, options) => {
        logger.warn({ ip: req.ip, path: req.path }, 'Rate limit exceeded for API');
        res.status(options.statusCode).json(options.message);
    },
    skip: () => config.nodeEnv === 'test' // Deshabilitar en tests
});

/**
 * Limitador estricto para rutas de autenticación
 * Permite 20 peticiones cada 15 minutos por IP
 * Ayuda a prevenir ataques de fuerza bruta
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 20, // Estricto: solo 20 intentos
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Demasiados intentos de autenticación, por favor intenta nuevamente en 15 minutos'
    },
    handler: (req, res, next, options) => {
        logger.warn({ ip: req.ip, path: req.path }, 'Auth rate limit exceeded');
        res.status(options.statusCode).json(options.message);
    },
    skip: () => config.nodeEnv === 'test'
});

/**
 * Limitador para webhooks (deben ser rápidos pero protegidos de spam)
 * Kick/Twitch pueden enviar muchos eventos, así que el límite es más alto
 */
export const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    limit: 600, // ~10 peticiones por segundo si vienen de la misma IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many webhook events' },
    skip: () => config.nodeEnv === 'test'
});
