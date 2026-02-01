/** Servicio de moderación para YouTube */

import axios from 'axios';
import { logger } from '../../utils/logger';
import { YouTubeQuotaManager } from '../platforms/YouTubeQuotaManager';
import { YouTubePollingConfig } from '../../config/youtube.polling.config';

export interface YouTubeDeleteMessageParams {
    messageId: string;
    accessToken: string;
}

export interface YouTubeBanUserParams {
    liveChatId: string;
    channelId: string; // ID del canal del usuario a banear
    accessToken: string;
    duration?: number; // En segundos para timeout, omitir para ban permanente
}

export class YouTubeModerationService {
    /**
     * Elimina un mensaje específico del chat de YouTube
     */
    async deleteMessage(params: YouTubeDeleteMessageParams): Promise<void> {
        const { messageId, accessToken } = params;
        const quotaManager = YouTubeQuotaManager.getInstance();
        const cost = YouTubePollingConfig.OPERATION_COSTS.CHAT_MESSAGE_DELETE;

        if (!quotaManager.hasQuota(cost)) {
            throw new Error('Cuota de YouTube agotada. Intenta mañana.');
        }

        try {
            logger.info({ messageId }, 'Attempting to delete YouTube message');

            await axios.delete('https://www.googleapis.com/youtube/v3/liveChat/messages', {
                params: {
                    id: messageId
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            quotaManager.consumeQuota(cost);

            logger.info({ messageId }, 'YouTube message deleted successfully');
        } catch (error) {
            this.handleQuotaError(error);

            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data as { error?: { message?: string } } | undefined;

                logger.error({
                    messageId,
                    status,
                    statusText: error.response?.statusText,
                    errorData
                }, 'Error deleting YouTube message');

                if (status === 401) {
                    throw new Error('Token de acceso inválido o expirado');
                } else if (status === 403) {
                    throw new Error('No tienes permisos de moderador en este chat');
                } else if (status === 404) {
                    throw new Error('Mensaje no encontrado o ya fue eliminado');
                } else {
                    throw new Error(
                        `Error al eliminar mensaje de YouTube: ${errorData?.error?.message || error.message}`
                    );
                }
            }
            logger.error({ err: error, messageId }, 'Unexpected error deleting YouTube message');
            throw error;
        }
    }

    /**
     * Banea o pone en timeout a un usuario en YouTube
     */
    async banUser(params: YouTubeBanUserParams): Promise<void> {
        const { liveChatId, channelId, accessToken, duration } = params;
        const quotaManager = YouTubeQuotaManager.getInstance();
        const cost = YouTubePollingConfig.OPERATION_COSTS.CHAT_BAN_USER;

        if (!quotaManager.hasQuota(cost)) {
            throw new Error('Cuota de YouTube agotada. Intenta mañana.');
        }

        try {
            const body: {
                snippet: {
                    liveChatId: string;
                    type: string;
                    bannedUserDetails: {
                        channelId: string;
                    };
                    banDurationSeconds?: number;
                };
            } = {
                snippet: {
                    liveChatId,
                    type: duration ? 'temporary' : 'permanent',
                    bannedUserDetails: {
                        channelId
                    }
                }
            };

            if (duration) {
                body.snippet.banDurationSeconds = duration;
            }

            logger.info({
                liveChatId,
                channelId,
                duration,
                isPermanent: !duration
            }, 'Attempting to ban/timeout YouTube user');

            await axios.post(
                'https://www.googleapis.com/youtube/v3/liveChat/bans',
                body,
                {
                    params: {
                        part: 'snippet'
                    },
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: 10000
                }
            );

            quotaManager.consumeQuota(cost);

            const actionType = duration ? `timeout de ${duration} segundos` : 'ban permanente';
            logger.info({
                channelId,
                liveChatId,
                actionType
            }, 'YouTube user banned/timeout successfully');
        } catch (error) {
            this.handleQuotaError(error);

            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data as { error?: { message?: string } } | undefined;

                logger.error({
                    channelId,
                    liveChatId,
                    status,
                    statusText: error.response?.statusText,
                    errorData
                }, 'Error banning YouTube user');

                if (status === 401) {
                    throw new Error('Token de acceso inválido o expirado');
                } else if (status === 403) {
                    throw new Error('No tienes permisos de moderador en este chat o no puedes banear a este usuario');
                } else if (status === 400) {
                    throw new Error('Petición inválida. Verifica que el ID del canal sea correcto');
                } else if (status === 404) {
                    throw new Error('Chat en vivo no encontrado');
                } else {
                    throw new Error(
                        `Error al banear usuario en YouTube: ${errorData?.error?.message || error.message}`
                    );
                }
            }
            logger.error({ err: error, channelId, liveChatId }, 'Unexpected error banning YouTube user');
            throw error;
        }
    }

    /**
     * Maneja errores de cuota agotada
     */
    private handleQuotaError(error: unknown): void {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            const errorData = error.response.data as { error?: { errors?: Array<{ reason?: string }> } };
            const isQuotaError = errorData?.error?.errors?.some(e => e.reason === 'quotaExceeded');

            if (isQuotaError) {
                YouTubeQuotaManager.getInstance().markAsExhausted();
                throw new Error('Cuota de YouTube agotada. Intenta mañana.');
            }
        }
    }
}
