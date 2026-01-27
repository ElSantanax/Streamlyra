import dotenv from 'dotenv';
import { validateConfig } from './validation';
import { oauthConfig } from './oauth.config';

dotenv.config();

// Validar variables de entorno requeridas
validateConfig();

export const config = {
    port: parseInt(process.env.PORT || '3001', 10),
    databaseUrl: process.env.DATABASE_URL!,
    jwtSecret: process.env.JWT_SECRET!,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    nodeEnv: process.env.NODE_ENV || 'development',
    skipKickSignatureVerification: process.env.KICK_WEBHOOK_SKIP_SIGNATURE === 'true',

    cookie: {
        domain: process.env.COOKIE_DOMAIN,
        secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : (process.env.NODE_ENV === 'production'),
        sameSite: ((): 'lax' | 'none' | 'strict' => {
            const raw = (process.env.COOKIE_SAMESITE || '').toLowerCase();
            if (raw === 'lax' || raw === 'none' || raw === 'strict') return raw;
            return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
        })(),
    },

    // OAuth configuration
    oauth: oauthConfig,

    // Legacy access (deprecated, use oauth instead)
    twitch: oauthConfig.twitch,
    youtube: oauthConfig.youtube,
    kick: oauthConfig.kick
} as const;
