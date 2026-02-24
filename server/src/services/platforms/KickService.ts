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

    private static readonly TIMEOUT = 10000;
    private static readonly TOKEN_URL = 'https://id.kick.com/oauth/token';
    private static readonly API_BASE_V1 = 'https://api.kick.com/public/v1';
    private static readonly USER_URL = `${KickService.API_BASE_V1}/users`;
    private static readonly CHANNEL_URL = `${KickService.API_BASE_V1}/channels`;
    private static readonly CHAT_URL = `${KickService.API_BASE_V1}/chat`;
    private static readonly EVENTS_URL = `${KickService.API_BASE_V1}/events/subscriptions`;

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

    private static getAuthHeaders(accessToken: string): Record<string, string> {
        return {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    }

    private handleKickApiError(error: unknown, context: string): never {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ message?: string }>;
            const status = axiosError.response?.status;
            const errorData = axiosError.response?.data;

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
        throw error;
    }

    protected async fetchUserProfile(accessToken: string): Promise<KickOAuthUser> {
        try {
            const userResponse = await axios.get<KickOAuthUserResponse>(KickService.USER_URL, {
                headers: KickService.getAuthHeaders(accessToken),
                timeout: KickService.TIMEOUT
            });

            const users = userResponse.data?.data;
            if (!users || users.length === 0) {
                throw new Error('Kick API response missing user profile data.');
            }

            return users[0];
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

    static async subscribeToWebhook(accessToken: string, broadcasterUserId: string, callbackUrl: string) {
        try {
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
                        { name: 'livestream.status.updated', version: 1 },
                        { name: 'channel.reward.redemption.updated', version: 1 }
                    ],
                    method: 'webhook',
                    webhook_url: callbackUrl
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

    async sendChatMessage(
        accessToken: string,
        channelId: string,
        message: string,
        type: 'bot' | 'user' = 'user',
        replyToMessageId?: string
    ): Promise<string> {
        try {
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

            const responseData = response.data as { data?: { message_id?: string | number } };
            const messageId = responseData.data?.message_id || `kick-${Date.now()}`;
            return messageId.toString();
        } catch (error) {
            this.handleKickApiError(error, 'sendChatMessage');
        }
    }
}