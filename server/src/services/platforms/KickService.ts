import axios from 'axios';
import { PlatformProfile, AuthTokens } from '../AuthService';
import { config } from '../../config';
import { OAuthUtils, OAuthExchangeOptions } from '../../utils/oauth.utils';

interface KickTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
}

interface KickUserResponse {
    data: Array<{
        user_id: number;
        name: string;
        email?: string;
        profile_picture: string;
    }>;
}

interface KickChannelResponse {
    data: Array<{
        broadcaster_user_id: number;
        slug: string;
        stream?: {
            is_live: boolean;
            viewer_count: number;
        } | null;
        stream_title?: string;
    }>;
}

export class KickService {
    private static readonly TOKEN_URL = 'https://id.kick.com/oauth/token';
    private static readonly USER_URL = 'https://api.kick.com/public/v1/users';
    private static readonly CHANNEL_URL = 'https://api.kick.com/public/v1/channels';

    private static get oauthOptions(): OAuthExchangeOptions {
        return {
            baseUrl: KickService.TOKEN_URL,
            clientId: config.kick.clientId!,
            clientSecret: config.kick.clientSecret!,
            redirectUri: config.kick.redirectUri!,
            contentType: 'form'
        };
    }

    static async getChannelByToken(accessToken: string): Promise<KickChannelResponse['data']> {
        const response = await axios.get<KickChannelResponse>(KickService.CHANNEL_URL, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
        return response.data.data;
    }

    static async getProfileAndTokens(code: string, codeVerifier?: string) {
        const extraParams: Record<string, string> = {};
        if (codeVerifier) extraParams.code_verifier = codeVerifier;

        const { access_token, refresh_token, expires_in } = await OAuthUtils.exchangeCode<KickTokenResponse>(
            code,
            this.oauthOptions,
            extraParams
        );

        const userResponse = await axios.get<KickUserResponse>(KickService.USER_URL, {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });

        const kickUser = userResponse.data.data[0];

        return {
            profile: {
                provider: 'kick',
                providerId: kickUser.user_id.toString(),
                username: kickUser.name,
                displayName: kickUser.name,
                avatarUrl: kickUser.profile_picture,
                email: kickUser.email
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
            await OAuthUtils.refreshTokens<KickTokenResponse>(refreshToken, this.oauthOptions);

        return {
            accessToken: access_token,
            refreshToken: new_refresh_token || refreshToken,
            expiresIn: expires_in
        };
    }

    static async subscribeToChat(accessToken: string, broadcasterUserId: string) {
        try {
            return await axios.post('https://api.kick.com/public/v1/events/subscriptions', {
                broadcaster_user_id: parseInt(broadcasterUserId),
                events: [{ name: 'chat.message.sent', version: 1 }],
                method: 'webhook'
            }, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('[KickService] Error suscribiendo a webhook:', error);
            throw error;
        }
    }
}
