/** Servicio de YouTube con OAuth - Orquestador principal */

import { BasePlatformService, PlatformProfile } from '../base/BasePlatformService';
import { config } from '../../config';
import { OAuthExchangeOptions } from '../../utils/oauth.utils';
import { Platform } from '../../constants/platforms';
import {
    YouTubeProfileService,
    YouTubeLiveChatService
} from './youtube';

interface YouTubeChannel {
    id: string;
    snippet: {
        title: string;
        thumbnails?: {
            default?: {
                url: string;
            };
        };
    };
}

export class YouTubeService extends BasePlatformService {
    protected readonly platformName: Platform = 'youtube';

    protected readonly oauthOptions: OAuthExchangeOptions = {
        baseUrl: 'https://oauth2.googleapis.com/token',
        clientId: config.oauth.youtube.clientId!,
        clientSecret: config.oauth.youtube.clientSecret!,
        redirectUri: config.oauth.youtube.redirectUri!
    };

    private readonly profileService = new YouTubeProfileService();
    private readonly liveChatService = new YouTubeLiveChatService();

    protected async fetchUserProfile(accessToken: string): Promise<YouTubeChannel> {
        return this.profileService.fetchUserProfile(accessToken);
    }

    protected normalizePlatformProfile(channel: YouTubeChannel): PlatformProfile {
        return this.profileService.normalizePlatformProfile(channel);
    }

    async getActiveLiveChatId(accessToken: string): Promise<string | null> {
        return this.liveChatService.getActiveLiveChatId(accessToken);
    }

    async sendChatMessage(
        accessToken: string,
        liveChatId: string,
        message: string
    ): Promise<void> {
        return this.liveChatService.sendChatMessage(accessToken, liveChatId, message);
    }
}
