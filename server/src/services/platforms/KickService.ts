/** Servicio de Kick con OAuth, webhooks y envío de mensajes */

import axios, { AxiosError } from 'axios';
import { BasePlatformService, PlatformProfile } from '../base/BasePlatformService';
import { config } from '../../config';
import { OAuthExchangeOptions } from '../../utils/oauth.utils';
import { logger } from '../../utils/logger';
import { Platform } from '../../constants/platforms';
import {
    KickOAuthUser,
    KickOAuthUserResponse,
    KickChannel,
    KickChannelResponse
} from '../../types/kick.types';

export class KickService extends BasePlatformService {
    protected readonly platformName: Platform = 'kick';

    // API Configuration
    private static readonly TIMEOUT = 10000;
    private static readonly TOKEN_URL = 'https://id.kick.com/oauth/token';
    private static readonly API_BASE_V1 = 'https://api.kick.com/public/v1';
    private static readonly USER_URL = `${KickService.API_BASE_V1}/users`;
    private static readonly CHANNEL_URL = `${KickService.API_BASE_V1}/channels`;
    private static readonly CHAT_URL = `${KickService.API_BASE_V1}/chat`;
    private static readonly EVENTS_URL = `${KickService.API_BASE_V1}/events/subscriptions`;

    // HTTP Status Codes
    private static readonly HTTP_UNAUTHORIZED = 401;
    private static readonly HTTP_FORBIDDEN = 403;
    private static readonly HTTP_NOT_FOUND = 404;
    private static readonly HTTP_TOO_MANY_REQUESTS = 429;

    protected readonly oauthOptions: OAuthExchangeOptions = {
        baseUrl: KickService.TOKEN_URL,
        clientId: config.oauth.kick.clientId!,
        clientSecret: config.oauth.kick.clientSecret!,
        redirectUri: config.oauth.kick.redirectUri!,
        contentType: 'form'
    };

    /**
     * Genera headers de autenticación para las peticiones a la API de Kick
     */
    private static getAuthHeaders(accessToken: string): Record<string, string> {
        return {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    }

    /**
     * Maneja errores de la API de Kick de forma centralizada
     */
    private handleKickApiError(error: unknown, context: string): never {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ message?: string }>;
            const status = axiosError.response?.status;
            const errorData = axiosError.response?.data;

            // Log de información esencial solamente
            logger.warn(
                {
                    platform: 'kick',
                    context,
                    status,
                    message: axiosError.message,
                    kickMessage: errorData?.message
                },
                `Kick API Error: ${context}`
            );

            switch (status) {
                case KickService.HTTP_UNAUTHORIZED:
                    throw new Error('Token de acceso inválido o expirado en Kick');
                case KickService.HTTP_FORBIDDEN:
                    throw new Error('No tienes permisos en Kick (Forbidden)');
                case KickService.HTTP_NOT_FOUND:
                    throw new Error('Recurso de Kick no encontrado');
                case KickService.HTTP_TOO_MANY_REQUESTS:
                    throw new Error('Límite de tasa excedido en Kick');
                default:
                    throw new Error(errorData?.message || axiosError.message);
            }
        }

        logger.error({ platform: 'kick', context }, `Unexpected error in Kick API: ${context}`);
        throw error;
    }

    protected async fetchUserProfile(accessToken: string): Promise<KickOAuthUser> {
        try {
            const userResponse = await axios.get<KickOAuthUserResponse>(KickService.USER_URL, {
                headers: KickService.getAuthHeaders(accessToken),
                timeout: KickService.TIMEOUT
            });

            return userResponse.data.data[0];
        } catch (error) {
            this.handleKickApiError(error, 'fetchUserProfile');
        }
    }

    protected normalizePlatformProfile(kickUser: KickOAuthUser): PlatformProfile {
        return {
            provider: 'kick',
            providerId: kickUser.user_id.toString(),
            providerUsername: kickUser.name,
            displayName: kickUser.name,
            avatarUrl: kickUser.profile_picture,
            email: kickUser.email
        };
    }

    /**
     * Obtiene los canales asociados al token de acceso
     */
    static async getChannels(accessToken: string): Promise<KickChannel[]> {
        try {
            const response = await axios.get<KickChannelResponse>(KickService.CHANNEL_URL, {
                headers: KickService.getAuthHeaders(accessToken),
                timeout: KickService.TIMEOUT
            });
            return response.data.data;
        } catch (error) {
            logger.error({ err: error, platform: 'kick' }, 'Error fetching Kick channels');
            throw error;
        }
    }


    /**
     * Suscribe a eventos de chat mediante webhook
     * Según la documentación oficial, el callback_url se configura en el dashboard de Kick
     */
    static async subscribeToWebhook(accessToken: string, broadcasterUserId: string) {
        try {
            logger.debug({ platform: 'kick', broadcasterUserId }, 'Subscribing to Kick events');

            return await axios.post(
                KickService.EVENTS_URL,
                {
                    broadcaster_user_id: parseInt(broadcasterUserId),
                    events: [
                        { name: 'chat.message.sent', version: 1 },
                        { name: 'channel.followed', version: 1 },
                        { name: 'channel.subscription.new', version: 1 },
                        { name: 'channel.subscription.renewal', version: 1 },
                        { name: 'channel.subscription.gifts', version: 1 },
                        { name: 'livestream.status.updated', version: 1 }
                    ],
                    method: 'webhook'
                },
                {
                    headers: KickService.getAuthHeaders(accessToken),
                    timeout: KickService.TIMEOUT
                }
            );
        } catch (error) {
            logger.error({ err: error, platform: 'kick', broadcasterUserId }, 'Error subscribing to Kick events');
            throw error;
        }
    }

    /**
     * Envía un mensaje al chat de Kick
     */
    async sendChatMessage(
        accessToken: string,
        channelId: string,
        message: string,
        type: 'bot' | 'user' = 'user',
        replyToMessageId?: string
    ): Promise<string> {
        try {
            logger.debug({ platform: 'kick', channelId, messageLength: message.length, type }, 'Sending message to Kick official API');

            const response = await axios.post(
                KickService.CHAT_URL,
                {
                    content: message,
                    type: type,
                    broadcaster_user_id: parseInt(channelId),
                    reply_to_message_id: replyToMessageId
                },
                {
                    headers: KickService.getAuthHeaders(accessToken),
                    timeout: KickService.TIMEOUT
                }
            );

            // Kick API retorna el message ID en data.data.message_id
            const responseData = response.data as { data?: { message_id?: string | number; is_sent?: boolean } };
            const messageId = responseData.data?.message_id || `kick-${Date.now()}`;
            logger.info({ platform: 'kick', channelId, messageId, isSent: responseData.data?.is_sent }, 'Message sent successfully to Kick');
            return messageId.toString();
        } catch (error) {
            this.handleKickApiError(error, 'sendChatMessage');
        }
    }
}