/**
 * Tipos específicos de autenticación
 */

import { Platform } from '../constants/platforms';
import { AuthTokens, PlatformProfile } from './index';

export interface OAuthRequest {
    code: string;
    code_verifier?: string;
}

export interface TikTokAuthRequest {
    username: string;
}

export interface DisconnectRequest {
    provider: Platform;
}

export interface TokenPayload {
    id: string;
    username: string;
}

export interface OAuthService {
    getProfileAndTokens(code: string, codeVerifier?: string): Promise<{
        profile: PlatformProfile;
        tokens: AuthTokens;
    }>;
    refreshAccessToken(refreshToken: string): Promise<AuthTokens>;
}
