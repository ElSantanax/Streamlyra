import axios from 'axios';
import { PlatformProfile, AuthTokens } from '../AuthService';
import { YouTubeTokenResponse, YouTubeChannelResponse } from '../../types/youtube.types';
import { config } from '../../config';
import { OAuthUtils, OAuthExchangeOptions } from '../../utils/oauth.utils';

export class YouTubeService {
    private static get oauthOptions(): OAuthExchangeOptions {
        return {
            baseUrl: 'https://oauth2.googleapis.com/token',
            clientId: config.youtube.clientId!,
            clientSecret: config.youtube.clientSecret!,
            redirectUri: config.youtube.redirectUri!
        };
    }

    static async getProfileAndTokens(code: string) {
        const { access_token, refresh_token, expires_in } = await OAuthUtils.exchangeCode<YouTubeTokenResponse>(
            code,
            this.oauthOptions
        );

        const userResponse = await axios.get<YouTubeChannelResponse>('https://www.googleapis.com/youtube/v3/channels', {
            params: { part: 'snippet', mine: true },
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const items = userResponse.data.items;
        if (!items || items.length === 0) {
            throw new Error('No se encontró canal de YouTube asociado.');
        }

        const channel = items[0];

        return {
            profile: {
                provider: 'youtube',
                providerId: channel.id,
                username: channel.snippet.title.replace(/\s+/g, '').toLowerCase().substring(0, 15),
                displayName: channel.snippet.title,
                avatarUrl: channel.snippet.thumbnails?.default?.url || ''
            } as PlatformProfile,
            tokens: {
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresIn: expires_in
            } as AuthTokens
        };
    }

    static async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
        const { access_token, refresh_token: new_refresh_token, expires_in } =
            await OAuthUtils.refreshTokens<YouTubeTokenResponse>(refreshToken, this.oauthOptions);

        return {
            accessToken: access_token,
            refreshToken: new_refresh_token || refreshToken,
            expiresIn: expires_in
        };
    }
}
