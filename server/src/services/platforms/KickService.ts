import axios from 'axios';
import { PlatformProfile, AuthTokens } from '../AuthService';
import { KickApiResponse } from '../../types/kick.types';

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
        // La API Pública 2025 NO incluye el objeto chatroom directamente
        // Se usa el broadcaster_user_id para las suscripciones
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

    static async getChannelByToken(accessToken: string): Promise<KickChannelResponse['data']> {
        // Obtenemos la info del canal del usuario autenticado
        const response = await axios.get<KickChannelResponse>(KickService.CHANNEL_URL, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
        return response.data.data;
    }

    static async getProfileAndTokens(code: string, codeVerifier?: string) {
        const params: Record<string, string> = {
            client_id: process.env.KICK_CLIENT_ID || '',
            client_secret: process.env.KICK_CLIENT_SECRET || '',
            code,
            grant_type: 'authorization_code',
            redirect_uri: process.env.KICK_REDIRECT_URI || ''
        };

        if (codeVerifier) {
            params.code_verifier = codeVerifier;
        }

        const tokenResponse = await axios.post<KickTokenResponse>(
            KickService.TOKEN_URL,
            new URLSearchParams(params).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        const userResponse = await axios.get<KickUserResponse>(KickService.USER_URL, {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });

        const kickUser = userResponse.data.data[0];

        const profile: PlatformProfile = {
            provider: 'kick',
            providerId: kickUser.user_id.toString(),
            username: kickUser.name,
            displayName: kickUser.name,
            avatarUrl: kickUser.profile_picture,
            email: kickUser.email
        };

        const tokens: AuthTokens = {
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresIn: expires_in
        };

        return { profile, tokens };
    }

    static async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
        const response = await axios.post<KickTokenResponse>(
            KickService.TOKEN_URL,
            new URLSearchParams({
                client_id: process.env.KICK_CLIENT_ID || '',
                client_secret: process.env.KICK_CLIENT_SECRET || '',
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const { access_token, refresh_token: new_refresh_token, expires_in } = response.data;
        return {
            accessToken: access_token,
            refreshToken: new_refresh_token || refreshToken,
            expiresIn: expires_in
        };
    }

    static async getEventSubscriptions(accessToken: string, broadcasterUserId?: string) {
        const response = await axios.get<KickApiResponse<Array<{
            id: string;
            event: string;
            method: string;
            broadcaster_user_id?: number;
            version?: number;
        }>>>('https://api.kick.com/public/v1/events/subscriptions', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            },
            params: broadcasterUserId ? { broadcaster_user_id: parseInt(broadcasterUserId) } : undefined
        });
        return response.data.data as Array<{
            id: string;
            event: string;
            method: string;
            broadcaster_user_id?: number;
            version?: number;
        }>;
    }

    // Método oficial según docs.kick.com para suscribirse a eventos (webhooks)
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
