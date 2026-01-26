import axios from 'axios';
import { BasePlatformService, PlatformProfile } from '../base/BasePlatformService';
import { TwitchUserResponse } from '../../types/twitch.types';
import { config } from '../../config';
import { OAuthExchangeOptions } from '../../utils/oauth.utils';

interface TwitchUser {
    id: string;
    login: string;
    display_name: string;
    profile_image_url: string;
    email?: string;
}

/**
 * Servicio de Twitch
 * Responsabilidad: Autenticación OAuth específica de Twitch
 * 
 * Hereda métodos genéricos de BasePlatformService:
 * - getProfileAndTokens(code, codeVerifier)
 * - refreshAccessToken(refreshToken)
 * 
 * Implementa métodos específicos de Twitch:
 * - fetchUserProfile(accessToken)
 * - normalizePlatformProfile(twitchUser)
 */
import { Platform } from '../../constants/platforms';

export class TwitchService extends BasePlatformService {
    protected readonly platformName: Platform = 'twitch';

    protected readonly oauthOptions: OAuthExchangeOptions = {
        baseUrl: 'https://id.twitch.tv/oauth2/token',
        clientId: config.twitch.clientId!,
        clientSecret: config.twitch.clientSecret!,
        redirectUri: config.twitch.redirectUri!
    };

    /**
     * Obtiene perfil del usuario desde la API de Twitch
     * 
     * Endpoint: GET https://api.twitch.tv/helix/users
     * Retorna: Array con 1 usuario
     */
    protected async fetchUserProfile(accessToken: string): Promise<TwitchUser> {
        const userResponse = await axios.get<TwitchUserResponse>('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': config.twitch.clientId!,
                'Authorization': `Bearer ${accessToken}`
            }
        });

        return userResponse.data.data[0];
    }

    /**
     * Normaliza perfil de Twitch al formato común
     */
    protected normalizePlatformProfile(twitchUser: TwitchUser): PlatformProfile {
        return {
            provider: 'twitch',
            providerId: twitchUser.id,
            providerUsername: twitchUser.login,
            displayName: twitchUser.display_name,
            avatarUrl: twitchUser.profile_image_url,
            email: twitchUser.email
        };
    }
}
