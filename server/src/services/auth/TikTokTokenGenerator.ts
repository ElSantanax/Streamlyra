/** Generador de tokens placeholder para TikTok que no usa OAuth */

import { AuthTokens } from '../../types/index';

export class TikTokTokenGenerator {
    generatePlaceholderTokens(username: string): AuthTokens {
        return {
            access_token: `tiktok_placeholder_${username}_${Date.now()}`,
            expires_in: 365 * 24 * 60 * 60
        };
    }
}
