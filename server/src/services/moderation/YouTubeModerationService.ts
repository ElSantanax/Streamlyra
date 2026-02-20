import axios from 'axios';
import { logger } from '../../utils/logger';
import { YouTubeQuotaManager } from '../platforms/YouTubeQuotaManager';
import { YouTubePollingConfig } from '../../config/youtube.polling.config';
import { YouTubeQuotaErrorHandler } from '../platforms/youtube/YouTubeQuotaErrorHandler';

export interface YouTubeDeleteMessageParams {
    messageId: string;
    accessToken: string;
}

export interface YouTubeBanUserParams {
    liveChatId: string;
    channelId: string;
    accessToken: string;
    duration?: number;
}

export class YouTubeModerationService {

    async deleteMessage(params: YouTubeDeleteMessageParams): Promise<void> {
        const { messageId, accessToken } = params;
        const quotaManager = YouTubeQuotaManager.getInstance();
        const cost = YouTubePollingConfig.OPERATION_COSTS.CHAT_MESSAGE_DELETE;

        if (!(await quotaManager.hasQuota(cost))) {
            throw new Error('Cuota de YouTube agotada. Intenta mañana.');
        }

        try {
            logger.info({ messageId }, 'Attempting to delete YouTube message');

            await axios.delete('https://www.googleapis.com/youtube/v3/liveChat/messages', {
                params: { id: messageId },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            await quotaManager.consumeQuota(cost);
            logger.info({ messageId }, 'YouTube message deleted successfully');
        } catch (error) {
            await YouTubeQuotaErrorHandler.handleQuotaError(error);

            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data as { error?: { message?: string } } | undefined;

                logger.error({ messageId, status, statusText: error.response?.statusText, errorData }, 'Error deleting YouTube message');

                if (status === 401) {
                    throw new Error('Token de acceso inválido o expirado');
                } else if (status === 403) {
                    throw new Error('No tienes permisos de moderador en este chat');
                } else if (status === 404) {
                    throw new Error('Mensaje no encontrado o ya fue eliminado');
                } else {
                    throw new Error(`Error al eliminar mensaje de YouTube: ${errorData?.error?.message || error.message}`);
                }
            }
            throw error;
        }
    }

    async banUser(params: YouTubeBanUserParams): Promise<void> {
        const { liveChatId, channelId, accessToken, duration } = params;
        const quotaManager = YouTubeQuotaManager.getInstance();
        const cost = YouTubePollingConfig.OPERATION_COSTS.CHAT_BAN_USER;

        if (!(await quotaManager.hasQuota(cost))) {
            throw new Error('Cuota de YouTube agotada. Intenta mañana.');
        }

        try {
            const body = {
                snippet: {
                    liveChatId,
                    type: duration ? 'temporary' : 'permanent',
                    bannedUserDetails: { channelId },
                    ...(duration && { banDurationSeconds: duration })
                }
            };

            logger.info({ liveChatId, channelId, duration, isPermanent: !duration }, 'Attempting to ban/timeout YouTube user');

            await axios.post(
                'https://www.googleapis.com/youtube/v3/liveChat/bans',
                body,
                {
                    params: { part: 'snippet' },
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: 10000
                }
            );

            await quotaManager.consumeQuota(cost);
            logger.info({ channelId, liveChatId }, 'YouTube user banned/timeout successfully');
        } catch (error) {
            await YouTubeQuotaErrorHandler.handleQuotaError(error);

            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data as { error?: { message?: string } } | undefined;

                if (status === 401) {
                    throw new Error('Token de acceso inválido o expirado');
                } else if (status === 403) {
                    throw new Error('No tienes permisos de moderador o no puedes banear a este usuario');
                } else if (status === 400) {
                    throw new Error('Petición inválida. Verifica el ID del canal');
                } else if (status === 404) {
                    throw new Error('Chat en vivo no encontrado');
                } else {
                    throw new Error(`Error al banear usuario en YouTube: ${errorData?.error?.message || error.message}`);
                }
            }
            throw error;
        }
    }
}