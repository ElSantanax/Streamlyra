import { Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import { TwitchModerationService } from '../../services/moderation/TwitchModerationService';
import { ConnectionService } from '../../services/connection/ConnectionService';
import { Connection } from '../../models/Connection.model';
import { isValidModerationPayload } from '../validators/SocketValidators';
import { SocketErrorHandler } from '../utils/SocketErrorHandler';

export class ModerationSocketHandler {
    constructor(
        private twitchModerationService: TwitchModerationService,
        private connectionService: ConnectionService
    ) {}

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

                const { userId, platform, action, messageId, targetUserId, reason, duration } = payload;

                if (authenticatedUserId !== userId) {
                    SocketErrorHandler.emitModerationAuthError(socket, userId, authenticatedUserId);
                    return;
                }

                if (platform !== 'twitch') {
                    socket.emit('moderation_error', {
                        code: 'UNSUPPORTED_PLATFORM',
                        message: 'Moderación solo disponible para Twitch actualmente'
                    });
                    return;
                }

                const connection = await Connection.findOne({
                    where: { userId: authenticatedUserId, provider: 'twitch' }
                });

                if (!connection) {
                    socket.emit('moderation_error', {
                        code: 'NO_CONNECTION',
                        message: 'No tienes una conexión de Twitch activa'
                    });
                    return;
                }

                const validToken = await this.connectionService.getValidAccessToken(
                    authenticatedUserId,
                    'twitch'
                );

                if (!validToken) {
                    socket.emit('moderation_error', {
                        code: 'INVALID_TOKEN',
                        message: 'Token de Twitch inválido o expirado'
                    });
                    return;
                }

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
                        messageId,
                        message: 'Mensaje eliminado'
                    });

                    logger.info({ userId: authenticatedUserId, messageId }, 'Message deleted successfully');

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
                        targetUserId,
                        message: action === 'ban' ? 'Usuario baneado' : 'Usuario en timeout'
                    });

                    logger.info({ userId: authenticatedUserId, targetUserId, action },
                        'User moderation action completed');
                }

            } catch (error) {
                SocketErrorHandler.emitModerationInternalError(socket, error);
            }
        });
    }
}
