import { TwitchService } from './TwitchService';
import { YouTubeService } from './YouTubeService';
import { KickService } from './KickService';
import { OAuthService } from '../../types/auth.types';
import { Platform } from '../../constants/platforms';
import { AppError } from '../../utils/AppError';

export class PlatformServiceFactory {
    private static readonly OAUTH_SERVICES: Record<string, OAuthService> = {
        twitch: new TwitchService(),
        youtube: new YouTubeService(),
        kick: new KickService()
    };

    static getService(platform: Platform): OAuthService {
        const service = this.OAUTH_SERVICES[platform];

        if (!service) {
            throw new AppError(`Platform ${platform} is not supported for OAuth`, 400);
        }

        return service;
    }

    static supportsOAuth(platform: Platform): boolean {
        return platform in this.OAUTH_SERVICES;
    }
}
