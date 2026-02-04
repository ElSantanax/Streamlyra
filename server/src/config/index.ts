import 'dotenv/config';
import { validateConfig } from './validation';
import { oauthConfig } from './oauth.config';

// Validar variables de entorno requeridas
validateConfig();

export const config = {
    port: parseInt(process.env.PORT || '3001', 10),
    databaseUrl: process.env.DATABASE_URL!,
    jwtSecret: process.env.JWT_SECRET!,
    encryptionKey: process.env.ENCRYPTION_KEY!,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    appUrl: process.env.APP_URL || 'http://localhost:3001',
    nodeEnv: process.env.NODE_ENV || 'development',
    skipKickSignatureVerification: process.env.NODE_ENV === 'production'
        ? false
        : process.env.KICK_WEBHOOK_SKIP_SIGNATURE === 'true',

    cookie: {
        domain: process.env.COOKIE_DOMAIN,
        secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : (process.env.NODE_ENV === 'production'),
        sameSite: ((): 'lax' | 'none' | 'strict' => {
            const raw = (process.env.COOKIE_SAMESITE || '').toLowerCase();
            if (raw === 'lax' || raw === 'none' || raw === 'strict') return raw;
            return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
        })(),
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días por defecto
    },

    // OAuth configuration
    oauth: oauthConfig
} as const;
