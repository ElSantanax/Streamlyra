import { Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import { TwitchModerationService } from '../../services/moderation/TwitchModerationService';
import { KickModerationService } from '../../services/moderation/KickModerationService';
import { YouTubeModerationService } from '../../services/moderation/YouTubeModerationService';
import { ConnectionService } from '../../services/connection/ConnectionService';
import { YouTubeService } from '../../services/platforms/YouTubeService';
import { Connection } from '../../models/Connection.model';
import { isValidModerationPayload } from '../validators/SocketValidators';
import type { ModerationActionRequest } from '../../types/message.types';
import { Platform } from '../../constants/platforms';
import { SocketErrorHandler } from '../utils/SocketErrorHandler';

export class ModerationSocketHandler {
    constructor(
        private twitchModerationService: TwitchModerationService,
        private kickModerationService: KickModerationService,
        private youtubeModerationService: YouTubeModerationService,
        private connectionService: ConnectionService,
        private youtubeService: YouTubeService
    ) { }

    setupHandler(socket: Socket, authenticatedUserId: string) {
        socket.on('moderation_action', async (payload: unknown) => {
            logger.info({ socketId: socket.id }, 'Received moderation_action event');

            try {
                if (!isValidModerationPayload(payload)) {
                    SocketErrorHandler.emitModerationError(
                        socket,
                        'INVALID_PAYLOAD',
                        'Datos de moderación inválidos',
                        { payload }
                    );
                    return;
                }

                const p = payload as ModerationActionRequest;
                const { userId, platform, action, messageId, targetUserId, reason, duration } = p;

                if (authenticatedUserId !== userId) {
                    SocketErrorHandler.emitModerationAuthError(socket, userId, authenticatedUserId);
                    return;
                }

                if (platform !== 'twitch' && platform !== 'kick' && platform !== 'youtube' && platform !== 'dashboard') {
                    socket.emit('moderation_error', {
                        code: 'UNSUPPORTED_PLATFORM',
                        message: 'Moderación solo disponible para Twitch, Kick y YouTube'
                    });
                    return;
                }

                // Si es dashboard, manejar por separado ya que afecta a múltiples plataformas
                if (platform === 'dashboard') {
                    await this.handleDashboardModeration(
                        socket,
                        action,
                        messageId,
                        p.platformIds,
                        authenticatedUserId
                    );
                    return;
                }

                const connection = await Connection.findOne({
                    where: { userId: authenticatedUserId, provider: platform }
                });

                if (!connection) {
                    socket.emit('moderation_error', {
                        code: 'NO_CONNECTION',
                        message: `No tienes una conexión de ${platform} activa`
                    });
                    return;
                }

                const validToken = await this.connectionService.getValidAccessToken(
                    authenticatedUserId,
                    platform
                );

                if (!validToken) {
                    socket.emit('moderation_error', {
                        code: 'INVALID_TOKEN',
                        message: `Token de ${platform} inválido o expirado`
                    });
                    return;
                }

                // Manejar moderación según la plataforma
                if (platform === 'twitch') {
                    await this.handleTwitchModeration(
                        socket,
                        connection,
                        validToken,
                        action,
                        messageId,
                        targetUserId,
                        reason,
                        duration,
                        authenticatedUserId
                    );
                } else if (platform === 'kick') {
                    await this.handleKickModeration(
                        socket,
                        connection,
                        validToken,
                        action,
                        messageId,
                        targetUserId,
                        reason,
                        duration,
                        authenticatedUserId
                    );
                } else if (platform === 'youtube') {
                    await this.handleYouTubeModeration(
                        socket,
                        validToken,
                        action,
                        messageId,
                        targetUserId,
                        duration,
                        authenticatedUserId
                    );
                }

            } catch (error) {
                SocketErrorHandler.emitModerationInternalError(socket, error);
            }
        });
    }

    private async handleDashboardModeration(
        socket: Socket,
        action: string,
        messageId: string | undefined,
        platformIds: Record<string, string> | undefined,
        authenticatedUserId: string
    ): Promise<void> {
        if (action !== 'delete') {
            socket.emit('moderation_error', {
                code: 'UNSUPPORTED_ACTION',
                message: 'Solo se permite eliminar mensajes del dashboard'
            });
            return;
        }

        if (!platformIds || Object.keys(platformIds).length === 0) {
            // Si no hay platformIds, el mensaje solo se elimina del dashboard (ya ocurrió optimisticamente)
            socket.emit('moderation_success', {
                action: 'delete',
                platform: 'dashboard',
                messageId,
                message: 'Mensaje eliminado localmente'
            });
            return;
        }

        logger.info({ userId: authenticatedUserId, messageId, platformIds }, 'Processing dashboard message deletion');

        const deletionPromises = Object.entries(platformIds).map(async ([platform, pid]) => {
            try {
                const validToken = await this.connectionService.getValidAccessToken(
                    authenticatedUserId,
                    platform as Platform
                );

                if (!validToken) return { platform, success: false, error: 'Token inválido' };

                if (platform === 'twitch') {
                    const connection = await Connection.findOne({
                        where: { userId: authenticatedUserId, provider: 'twitch' }
                    });
                    if (!connection) return { platform, success: false, error: 'No conectado' };

                    await this.twitchModerationService.deleteMessage({
                        broadcasterId: connection.providerId,
                        moderatorId: connection.providerId,
                        messageId: pid,
                        accessToken: validToken
                    });
                } else if (platform === 'kick') {
                    await this.kickModerationService.deleteMessage({
                        messageId: pid,
                        accessToken: validToken
                    });
                } else if (platform === 'youtube') {
                    await this.youtubeModerationService.deleteMessage({
                        messageId: pid,
                        accessToken: validToken
                    });
                }

                return { platform, success: true };
            } catch (error) {
                logger.error({ err: error, platform, messageId: pid }, 'Failed to delete dashboard message from platform');
                return { platform, success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
            }
        });

        const results = await Promise.all(deletionPromises);
        const allSuccessful = results.every(r => r.success);

        if (allSuccessful) {
            socket.emit('moderation_success', {
                action: 'delete',
                platform: 'dashboard',
                messageId,
                message: 'Mensaje eliminado de todas las plataformas'
            });
        } else {
            const failed = results.filter(r => !r.success).map(r => r.platform).join(', ');
            socket.emit('moderation_warning', {
                action: 'delete',
                platform: 'dashboard',
                messageId,
                message: `Mensaje eliminado del dashboard, pero falló en: ${failed}`
            });
        }
    }

    private async handleTwitchModeration(
        socket: Socket,
        connection: Connection,
        validToken: string,
        action: string,
        messageId: string | undefined,
        targetUserId: string | undefined,
        reason: string | undefined,
        duration: number | undefined,
        authenticatedUserId: string
    ): Promise<void> {
        const broadcasterId = connection.providerId;
        const moderatorId = connection.providerId;

        if (action === 'delete' && messageId) {
            await this.twitchModerationService.deleteMessage({
                broadcasterId,
                moderatorId,
                messageId,
                accessToken: validToken
            });

            socket.emit('moderation_success', {
                action: 'delete',
                platform: 'twitch',
                messageId,
                message: 'Mensaje eliminado'
            });

            logger.info({ userId: authenticatedUserId, messageId, platform: 'twitch' }, 'Message deleted successfully');

        } else if ((action === 'ban' || action === 'timeout') && targetUserId) {
            await this.twitchModerationService.banUser({
                broadcasterId,
                moderatorId,
                userId: targetUserId,
                accessToken: validToken,
                reason,
                duration: action === 'timeout' ? (duration || 600) : undefined
            });

            socket.emit('moderation_success', {
                action,
                platform: 'twitch',
                targetUserId,
                message: action === 'ban' ? 'Usuario baneado' : 'Usuario en timeout'
            });

            // Emitir evento para eliminar mensajes del usuario baneado
            socket.emit('user_banned', {
                platform: 'twitch',
                targetUserId,
                action
            });

            logger.info({ userId: authenticatedUserId, targetUserId, action, platform: 'twitch' },
                'User moderation action completed');
        }
    }

    private async handleKickModeration(
        socket: Socket,
        connection: Connection,
        validToken: string,
        action: string,
        messageId: string | undefined,
        targetUserId: string | undefined,
        reason: string | undefined,
        duration: number | undefined,
        authenticatedUserId: string
    ): Promise<void> {
        const broadcasterUserId = connection.providerId;

        if (action === 'delete' && messageId) {
            await this.kickModerationService.deleteMessage({
                messageId,
                accessToken: validToken
            });

            socket.emit('moderation_success', {
                action: 'delete',
                platform: 'kick',
                messageId,
                message: 'Mensaje eliminado'
            });

            logger.info({ userId: authenticatedUserId, messageId, platform: 'kick' }, 'Message deleted successfully');

        } else if ((action === 'ban' || action === 'timeout') && targetUserId) {
            await this.kickModerationService.banUser({
                broadcasterUserId,
                userId: targetUserId,
                accessToken: validToken,
                duration: action === 'timeout' ? (duration || 10) : undefined, // Kick usa minutos
                reason
            });

            socket.emit('moderation_success', {
                action,
                platform: 'kick',
                targetUserId,
                message: action === 'ban' ? 'Usuario baneado' : 'Usuario en timeout'
            });

            // Emitir evento para eliminar mensajes del usuario baneado
            socket.emit('user_banned', {
                platform: 'kick',
                targetUserId,
                action
            });

            logger.info({ userId: authenticatedUserId, targetUserId, action, platform: 'kick' },
                'User moderation action completed');
        }
    }

    private async handleYouTubeModeration(
        socket: Socket,
        validToken: string,
        action: string,
        messageId: string | undefined,
        targetUserId: string | undefined,
        duration: number | undefined,
        authenticatedUserId: string
    ): Promise<void> {
        if (action === 'delete' && messageId) {
            await this.youtubeModerationService.deleteMessage({
                messageId,
                accessToken: validToken
            });

            socket.emit('moderation_success', {
                action: 'delete',
                platform: 'youtube',
                messageId,
                message: 'Mensaje eliminado'
            });

            logger.info({ userId: authenticatedUserId, messageId, platform: 'youtube' }, 'Message deleted successfully');

        } else if ((action === 'ban' || action === 'timeout') && targetUserId) {
            // Obtener el liveChatId activo
            const liveChatId = await this.youtubeService.getActiveLiveChatId(validToken);

            if (!liveChatId) {
                socket.emit('moderation_error', {
                    code: 'NO_LIVE_CHAT',
                    message: 'No hay un chat en vivo activo en YouTube'
                });
                return;
            }

            await this.youtubeModerationService.banUser({
                liveChatId,
                channelId: targetUserId,
                accessToken: validToken,
                duration: action === 'timeout' ? (duration || 300) : undefined // YouTube usa segundos
            });

            socket.emit('moderation_success', {
                action,
                platform: 'youtube',
                targetUserId,
                message: action === 'ban' ? 'Usuario baneado' : 'Usuario en timeout'
            });

            // Emitir evento para eliminar mensajes del usuario baneado
            socket.emit('user_banned', {
                platform: 'youtube',
                targetUserId,
                action
            });

            logger.info({ userId: authenticatedUserId, targetUserId, action, platform: 'youtube' },
                'User moderation action completed');
        }
    }
}
