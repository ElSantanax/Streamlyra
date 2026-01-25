import axios from 'axios';
import { PlatformProfile, AuthTokens } from '../AuthService';
import { TwitchTokenResponse, TwitchUserResponse } from '../../types/twitch.types';
import { config } from '../../config';
import { OAuthUtils, OAuthExchangeOptions } from '../../utils/oauth.utils';

export class TwitchService {
    private static get oauthOptions(): OAuthExchangeOptions {
        return {
            baseUrl: 'https://id.twitch.tv/oauth2/token',
            clientId: config.twitch.clientId!,
            clientSecret: config.twitch.clientSecret!,
            redirectUri: config.twitch.redirectUri!
        };
    }

    static async getProfileAndTokens(code: string) {
        const { access_token, refresh_token, expires_in } = await OAuthUtils.exchangeCode<TwitchTokenResponse>(
            code,
            this.oauthOptions
        );

        const userResponse = await axios.get<TwitchUserResponse>('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': config.twitch.clientId!,
                'Authorization': `Bearer ${access_token}`
            }
        });

        const twitchUser = userResponse.data.data[0];

        return {
            profile: {
                provider: 'twitch',
                providerId: twitchUser.id,
                username: twitchUser.login,
                displayName: twitchUser.display_name,
                avatarUrl: twitchUser.profile_image_url,
                email: twitchUser.email
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
            await OAuthUtils.refreshTokens<TwitchTokenResponse>(refreshToken, this.oauthOptions);

        return {
            accessToken: access_token,
            refreshToken: new_refresh_token || refreshToken,
            expiresIn: expires_in
        };
    }
}
