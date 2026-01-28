/**
 * Tipos específicos de autenticación
 */

import { AuthTokens, PlatformProfile } from './index';

export interface OAuthService {
    getProfileAndTokens(code: string, codeVerifier?: string): Promise<{
        profile: PlatformProfile;
        tokens: AuthTokens;
    }>;
    refreshAccessToken(refreshToken: string): Promise<AuthTokens>;
}

