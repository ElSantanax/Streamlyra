import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export interface DeleteMessageParams {
    broadcasterId: string;
    moderatorId: string;
    messageId: string;
    accessToken: string;
}

export interface BanUserParams {
    broadcasterId: string;
    moderatorId: string;
    userId: string;
    accessToken: string;
    reason?: string;
    duration?: number;
}

export class TwitchModerationService {
    async deleteMessage(params: DeleteMessageParams): Promise<void> {
        const { broadcasterId, moderatorId, messageId, accessToken } = params;

        try {
            await axios.delete('https://api.twitch.tv/helix/moderation/chat', {
                params: {
                    broadcaster_id: broadcasterId,
                    moderator_id: moderatorId,
                    message_id: messageId
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Client-ID': config.oauth.twitch.clientId!
                },
                timeout: 10000
            });

            logger.info({ messageId, broadcasterId }, 'Mensaje eliminado exitosamente');
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data as { message?: string } | undefined;

                if (status === 401) {
                    throw new Error('Token de acceso inválido o expirado');
                } else if (status === 403) {
                    throw new Error('No tienes permisos de moderador en este canal');
                } else if (status === 404) {
                    throw new Error('Mensaje no encontrado o ya fue eliminado');
                } else {
                    throw new Error(`Error al eliminar mensaje: ${errorData?.message || error.message}`);
                }
            }
            throw error;
        }
    }

    async banUser(params: BanUserParams): Promise<void> {
        const { broadcasterId, moderatorId, userId, accessToken, reason, duration } = params;

        try {
            const body: {
                data: {
                    user_id: string;
                    reason?: string;
                    duration?: number;
                };
            } = {
                data: {
                    user_id: userId
                }
            };

            if (reason) {
                body.data.reason = reason;
            }

            if (duration) {
                body.data.duration = duration;
            }

            await axios.post(
                'https://api.twitch.tv/helix/moderation/bans',
                body,
                {
                    params: {
                        broadcaster_id: broadcasterId,
                        moderator_id: moderatorId
                    },
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Client-ID': config.oauth.twitch.clientId!,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            logger.info({ userId, broadcasterId }, 'Usuario baneado/timeout exitosamente');
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data as { message?: string } | undefined;

                if (status === 401) {
                    throw new Error('Token de acceso inválido o expirado');
                } else if (status === 403) {
                    throw new Error('No tienes permisos de moderador en este canal');
                } else if (status === 400) {
                    throw new Error('No puedes banear a este usuario');
                } else {
                    throw new Error(`Error al banear usuario: ${errorData?.message || error.message}`);
                }
            }
            throw error;
        }
    }
}