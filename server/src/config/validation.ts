/**
 * Validación de variables de entorno requeridas
 * Se ejecuta al iniciar la aplicación
 */

export function validateConfig(): void {
    const requiredVars = [
        'DATABASE_URL',
        'JWT_SECRET',
        'TWITCH_CLIENT_ID',
        'TWITCH_CLIENT_SECRET',
        'TWITCH_REDIRECT_URI',
        'YOUTUBE_CLIENT_ID',
        'YOUTUBE_CLIENT_SECRET',
        'YOUTUBE_REDIRECT_URI',
        'KICK_CLIENT_ID',
        'KICK_CLIENT_SECRET',
        'KICK_REDIRECT_URI'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}`
        );
    }

    const cookieSameSite = (process.env.COOKIE_SAMESITE || '').toLowerCase();
    if (cookieSameSite && cookieSameSite !== 'lax' && cookieSameSite !== 'none' && cookieSameSite !== 'strict') {
        throw new Error(
            `Invalid COOKIE_SAMESITE value. Expected one of: lax, none, strict. Received: ${process.env.COOKIE_SAMESITE}`
        );
    }

    const cookieSecure = (process.env.COOKIE_SECURE || '').toLowerCase();
    if (cookieSecure && cookieSecure !== 'true' && cookieSecure !== 'false') {
        throw new Error(
            `Invalid COOKIE_SECURE value. Expected true or false. Received: ${process.env.COOKIE_SECURE}`
        );
    }
}
