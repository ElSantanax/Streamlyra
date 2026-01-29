/** Servicio de Kick con OAuth, webhooks y envío de mensajes */

import axios from 'axios';
import { BasePlatformService, PlatformProfile } from '../base/BasePlatformService';
import { config } from '../../config';
import { OAuthExchangeOptions } from '../../utils/oauth.utils';
import { logger } from '../../utils/logger';

interface KickUser {
    user_id: number;
    name: string;
    email?: string;
    profile_picture: string;
}

interface KickUserResponse {
    data: KickUser[];
}

interface KickChannel {
    broadcaster_user_id: number;
    slug: string;
    stream?: {
        is_live: boolean;
        viewer_count: number;
    } | null;
    stream_title?: string;
}

interface KickChannelResponse {
    data: KickChannel[];
}

import { Platform } from '../../constants/platforms';

export class KickService extends BasePlatformService {
    protected readonly platformName: Platform = 'kick';

    private static readonly TOKEN_URL = 'https://id.kick.com/oauth/token';
    private static readonly USER_URL = 'https://api.kick.com/public/v1/users';
    private static readonly CHANNEL_URL = 'https://api.kick.com/public/v1/channels';

    protected readonly oauthOptions: OAuthExchangeOptions = {
        baseUrl: KickService.TOKEN_URL,
        clientId: config.kick.clientId!,
        clientSecret: config.kick.clientSecret!,
        redirectUri: config.kick.redirectUri!,
        contentType: 'form'
    };

    protected async fetchUserProfile(accessToken: string): Promise<KickUser> {
        const userResponse = await axios.get<KickUserResponse>(KickService.USER_URL, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        return userResponse.data.data[0];
    }

    protected normalizePlatformProfile(kickUser: KickUser): PlatformProfile {
        return {
            provider: 'kick',
            providerId: kickUser.user_id.toString(),
            providerUsername: kickUser.name,
            displayName: kickUser.name,
            avatarUrl: kickUser.profile_picture,
            email: kickUser.email
        };
    }

    static async getChannelByToken(accessToken: string): Promise<KickChannel[]> {
        const response = await axios.get<KickChannelResponse>(KickService.CHANNEL_URL, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
        return response.data.data;
    }

    static async subscribeToChat(accessToken: string, broadcasterUserId: string, callbackUrl: string) {
        try {
            logger.debug({ platform: 'kick', broadcasterUserId, callbackUrl }, 'Subscribing to Kick chat webhook');

            return await axios.post('https://api.kick.com/public/v1/events/subscriptions', {
                broadcaster_user_id: parseInt(broadcasterUserId),
                events: [{ name: 'chat.message.sent', version: 1 }],
                method: 'webhook',
                callback_url: callbackUrl
            }, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            logger.error({ err: error, platform: 'kick', broadcasterUserId }, 'Error subscribing to Kick chat webhook');
            throw error;
        }
    }

    async sendChatMessage(accessToken: string, channelId: string, message: string): Promise<void> {
        try {
            logger.debug({ platform: 'kick', channelId, messageLength: message.length }, 'Sending message to Kick official API');

            await axios.post(
                'https://api.kick.com/public/v1/chat',
                {
                    content: message,
                    type: 'user',
                    broadcaster_user_id: parseInt(channelId)
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );

            logger.info({ platform: 'kick', channelId }, 'Message sent successfully to Kick');
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data as { message?: string } | undefined;

                if (status === 401) {
                    error.message = 'Token de acceso inválido o expirado';
                    throw error;
                } else if (status === 403) {
                    throw new Error('No tienes permisos para enviar mensajes en este canal. Verifica que tu cuenta esté verificada y no tenga restricciones.');
                } else if (status === 404) {
                    throw new Error('Canal de Kick no encontrado');
                } else if (status === 429) {
                    throw new Error('Límite de tasa excedido en Kick. Intenta de nuevo más tarde');
                } else {
                    throw new Error(
                        `Error de API de Kick: ${errorData?.message || error.message}`
                    );
                }
            }

            logger.error({ err: error, platform: 'kick', channelId }, 'Error sending message to Kick');
            throw error;
        }
    }
}