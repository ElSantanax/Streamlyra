/**
 * Tipos específicos de plataformas
 */

export interface OAuthExchangeOptions {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    contentType?: 'form' | 'json';
}

export interface OAuthTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type?: string;
    scope?: string;
}

export interface PlatformUserProfile {
    id: string;
    username: string;
    displayName: string;
    email?: string;
    avatarUrl?: string;
}
