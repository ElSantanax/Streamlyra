/**
 * Configuración OAuth centralizada para todas las plataformas
 * Evita duplicación y facilita mantenimiento
 */

export interface OAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

export const oauthConfig = {
    twitch: {
        clientId: process.env.TWITCH_CLIENT_ID!,
        clientSecret: process.env.TWITCH_CLIENT_SECRET!,
        redirectUri: process.env.TWITCH_REDIRECT_URI!
    } as OAuthConfig,

    youtube: {
        clientId: process.env.YOUTUBE_CLIENT_ID!,
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
        redirectUri: process.env.YOUTUBE_REDIRECT_URI!
    } as OAuthConfig,

    kick: {
        clientId: process.env.KICK_CLIENT_ID!,
        clientSecret: process.env.KICK_CLIENT_SECRET!,
        redirectUri: process.env.KICK_REDIRECT_URI!
    } as OAuthConfig
};
