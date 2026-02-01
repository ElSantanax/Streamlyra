/** Configuración de logger con pino para desarrollo y producción */

import pino from 'pino';
import { config } from '../config';

const isDevelopment = config.nodeEnv === 'development';

export const logger = pino({
    level: process.env.LOG_LEVEL || (isDevelopment ? 'info' : 'info'),
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers.set-cookie'
        ],
        remove: true
    },
    transport: isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard'
            }
        }
        : undefined
});
