/** Fábrica de perfiles de TikTok para construir perfiles de plataforma */

import { PlatformProfile } from '../../types/index';

export class TikTokProfileFactory {
    createProfile(cleanUsername: string): PlatformProfile {
        return {
            provider: 'tiktok',
            providerId: `tiktok_${cleanUsername}`,
            providerUsername: cleanUsername,
            displayName: cleanUsername,
            avatarUrl: ''
        };
    }
}
