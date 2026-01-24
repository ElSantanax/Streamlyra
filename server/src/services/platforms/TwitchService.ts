import axios from 'axios';
import { PlatformProfile, AuthTokens } from '../AuthService';
import { TwitchTokenResponse, TwitchUserResponse } from '../../types/twitch.types';

export class TwitchService {
    static async getProfileAndTokens(code: string) {
        // 1. Token Exchange
        const tokenResponse = await axios.post<TwitchTokenResponse>('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.TWITCH_REDIRECT_URI
            }
        });

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // 2. Profile Fetch
        const userResponse = await axios.get<TwitchUserResponse>('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${access_token}`
            }
        });

        const twitchUser = userResponse.data.data[0];

        const profile: PlatformProfile = {
            provider: 'twitch',
            providerId: twitchUser.id,
            username: twitchUser.login,
            displayName: twitchUser.display_name,
            avatarUrl: twitchUser.profile_image_url,
            email: twitchUser.email
        };

        const tokens: AuthTokens = {
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresIn: expires_in
        };

        return { profile, tokens };
    }

    static async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
        const response = await axios.post<TwitchTokenResponse>('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            }
        });

        const { access_token, refresh_token: new_refresh_token, expires_in } = response.data;
        return {
            accessToken: access_token,
            refreshToken: new_refresh_token || refreshToken,
            expiresIn: expires_in
        };
    }
}
