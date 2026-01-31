/** Servicio de moderación para Kick */

import axios from 'axios';
import { logger } from '../../utils/logger';

export interface KickDeleteMessageParams {
    messageId: string;
    accessToken: string;
}

export interface KickBanUserParams {
    broadcasterUserId: string;
    userId: string;
    accessToken: string;
    duration?: number; // En minutos para timeout (1-10080), omitir para ban permanente
    reason?: string; // Máximo 100 caracteres
}

export class KickModerationService {
    private static readonly BASE_URL = 'https://api.kick.com/public/v1';

    /**
     * Elimina un mensaje específico del chat de Kick
     */
    async deleteMessage(params: KickDeleteMessageParams): Promise<void> {
        const { messageId, accessToken } = params;

        try {
            logger.info({ messageId }, 'Attempting to delete Kick message');

            const response = await axios.delete(
                `${KickModerationService.BASE_URL}/chat/${messageId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': '*/*'
                    },
                    timeout: 10000
                }
            );

            // Log success details
            logger.info({
                messageId,
                status: response.status,
                statusText: response.statusText,
                data: response.data
            }, 'Kick message deleted successfully');

        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data as { message?: string } | undefined;

                logger.error({
                    messageId,
                    status,
                    statusText: error.response?.statusText,
                    errorData,
                    headers: error.response?.headers
                }, 'Error deleting Kick message');

                if (status === 401) {
                    throw new Error('Token de acceso inválido o expirado');
                } else if (status === 403) {
                    throw new Error('No tienes permisos de moderador en este canal. Verifica que tu token tenga el scope "moderation:chat_message:manage"');
                } else if (status === 404) {
                    throw new Error('Mensaje no encontrado o ya fue eliminado (404)');
                } else {
                    throw new Error(
                        `Error al eliminar mensaje de Kick (${status}): ${errorData?.message || error.message}`
                    );
                }
            }
            logger.error({ err: error, messageId }, 'Unexpected error deleting Kick message');
            throw error;
        }
    }

    /**
     * Banea o pone en timeout a un usuario en Kick
     */
    async banUser(params: KickBanUserParams): Promise<void> {
        const { broadcasterUserId, userId, accessToken, duration, reason } = params;

        try {
            // Kick requiere que los IDs sean números enteros (integers)
            const body: {
                broadcaster_user_id: number;
                user_id: number;
                duration?: number;
                reason?: string;
            } = {
                broadcaster_user_id: Number(broadcasterUserId),
                user_id: Number(userId)
            };

            // Si se incluye duration, es un timeout (en minutos). Si no, es un ban permanente
            if (duration !== undefined) {
                body.duration = Number(duration);
            }

            if (reason) {
                body.reason = reason.substring(0, 100);
            }

            logger.info({
                broadcaster_user_id: body.broadcaster_user_id,
                user_id: body.user_id,
                duration: body.duration,
                isPermanent: duration === undefined
            }, 'Attempting to ban/timeout Kick user');

            const response = await axios.post(
                `${KickModerationService.BASE_URL}/moderation/bans`,
                body,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'Accept': '*/*'
                    },
                    timeout: 10000
                }
            );

            const actionType = duration ? `timeout de ${duration} minutos` : 'ban permanente';
            logger.info({
                userId,
                broadcasterUserId,
                actionType,
                status: response.status,
                responseData: response.data
            }, 'Kick user banned/timeout successfully');
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data as { message?: string } | undefined;

                logger.error({
                    userId,
                    broadcasterUserId,
                    status,
                    statusText: error.response?.statusText,
                    errorData,
                    sentBody: {
                        broadcaster_user_id: Number(broadcasterUserId),
                        user_id: Number(userId),
                        duration
                    }
                }, 'Error banning Kick user');

                if (status === 401) {
                    throw new Error('Token de acceso inválido o expirado. Asegúrate de tener el scope "moderation:ban"');
                } else if (status === 403) {
                    throw new Error('No tienes permisos de moderador en este canal. Verifica que tu token tenga el scope "moderation:ban"');
                } else if (status === 400) {
                    throw new Error('Petición inválida. Verifica que los IDs sean correctos o si el usuario ya está baneado.');
                } else {
                    throw new Error(
                        `Error al banear usuario en Kick (${status}): ${errorData?.message || error.message}`
                    );
                }
            }
            logger.error({ err: error, userId, broadcasterUserId }, 'Unexpected error banning Kick user');
            throw error;
        }
    }

    /**
     * Desbanea a un usuario en Kick
     */
    async unbanUser(broadcasterUserId: string, userId: string, accessToken: string): Promise<void> {
        try {
            const response = await axios.delete(
                `${KickModerationService.BASE_URL}/moderation/bans`,
                {
                    data: {
                        broadcaster_user_id: parseInt(broadcasterUserId),
                        user_id: parseInt(userId)
                    },
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'Accept': '*/*'
                    },
                    timeout: 10000
                }
            );

            logger.info({
                userId,
                broadcasterUserId,
                status: response.status,
                responseData: response.data
            }, 'Kick user unbanned successfully');
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data as { message?: string } | undefined;

                logger.error({
                    userId,
                    broadcasterUserId,
                    status,
                    statusText: error.response?.statusText,
                    errorData
                }, 'Error unbanning Kick user');

                if (status === 401) {
                    throw new Error('Token de acceso inválido o expirado. Asegúrate de tener el scope "moderation:ban"');
                } else if (status === 403) {
                    throw new Error('No tienes permisos de moderador en este canal. Verifica que tu token tenga el scope "moderation:ban"');
                } else if (status === 404) {
                    throw new Error('Usuario no encontrado en la lista de baneados (404)');
                } else {
                    throw new Error(
                        `Error al desbanear usuario en Kick (${status}): ${errorData?.message || error.message}`
                    );
                }
            }
            logger.error({ err: error, userId, broadcasterUserId }, 'Unexpected error unbanning Kick user');
            throw error;
        }
    }
}
