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

import { Platform } from '../../constants/platforms';

export class TwitchService extends BasePlatformService {
    protected readonly platformName: Platform = 'twitch';

    protected readonly oauthOptions: OAuthExchangeOptions = {
        baseUrl: 'https://id.twitch.tv/oauth2/token',
        clientId: config.oauth.twitch.clientId!,
        clientSecret: config.oauth.twitch.clientSecret!,
        redirectUri: config.oauth.twitch.redirectUri!
    };

    protected async fetchUserProfile(accessToken: string): Promise<TwitchUser> {
        const userResponse = await axios.get<TwitchUserResponse>('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': config.oauth.twitch.clientId!,
                'Authorization': `Bearer ${accessToken}`
            },
            timeout: 10000
        });

        const users = userResponse.data.data;

        if (!users || users.length === 0) {
            throw new Error('No se encontró información del usuario en Twitch.');
        }

        return users[0];
    }

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

    async sendChatMessage(
        accessToken: string,
        broadcasterId: string,
        senderId: string,
        message: string
    ): Promise<string> {
        try {
            const response = await axios.post(
                'https://api.twitch.tv/helix/chat/messages',
                {
                    broadcaster_id: broadcasterId,
                    sender_id: senderId,
                    message: message
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Client-ID': config.oauth.twitch.clientId!,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            if (response.status !== 200) {
                throw new Error(`Twitch API error: ${response.statusText}`);
            }

            const responseData = response.data as {
                data?: Array<{
                    is_sent?: boolean;
                    message_id: string;
                }>
            };
            const data = responseData.data?.[0];
            if (!data?.is_sent) {
                throw new Error('Twitch reportó que el mensaje no fue enviado');
            }

            return data.message_id;
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data as { message?: string } | undefined;

                if (status === 401) {
                    error.message = 'Token de acceso inválido o expirado';
                    throw error;
                } else if (status === 403) {
                    throw new Error('No tienes permisos para enviar mensajes en este canal');
                } else if (status === 422) {
                    throw new Error('El mensaje no cumple con los requisitos de Twitch');
                } else if (status === 429) {
                    throw new Error('Límite de tasa excedido. Intenta de nuevo más tarde');
                } else {
                    throw new Error(
                        `Error de API de Twitch: ${errorData?.message || error.message}`
                    );
                }
            }
            throw error;
        }
    }
}
