import { Server, Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import { MessageSenderService } from '../../services/message/MessageSenderService';
import { isValidSendMessagePayload } from '../validators/SocketValidators';
import { SocketErrorHandler } from '../utils/SocketErrorHandler';

export class MessageSocketHandler {
    constructor(
        private messageSenderService: MessageSenderService
    ) { }

    setupHandler(socket: Socket, io: Server, authenticatedUserId: string) {
        socket.on('send_message', async (payload: unknown) => {
            logger.info({ socketId: socket.id }, 'Received send_message event');

            try {
                if (!isValidSendMessagePayload(payload)) {
                    SocketErrorHandler.emitValidationError(
                        socket,
                        'INVALID_PAYLOAD',
                        'Datos inválidos. Verifica el mensaje y las plataformas.',
                        { payload, reason: 'Invalid payload structure' }
                    );
                    return;
                }
                logger.debug({ socketId: socket.id }, 'Payload validation passed');

                const { userId, message, platforms } = payload;

                if (authenticatedUserId !== userId) {
                    SocketErrorHandler.emitAuthorizationError(
                        socket,
                        userId,
                        authenticatedUserId,
                        'send message'
                    );
                    return;
                }

                const sessionUserId = authenticatedUserId as string;

                logger.debug({ socketId: socket.id, userId: sessionUserId }, 'Authorization validation passed');

                const filteredPlatforms = platforms.filter(p => p !== 'tiktok');

                logger.info(
                    { userId: sessionUserId, platforms: filteredPlatforms, messageLength: message.length },
                    'Processing send_message request'
                );

                const messageId = `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const chatMessage: {
                    id: string;
                    platform: string;
                    user: string;
                    message: string;
                    time: string;
                    color: string;
                    isOwner: boolean;
                    status: string;
                } = {
                    id: messageId,
                    platform: 'dashboard',
                    user: 'Tú',
                    message,
                    time: new Date().toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    color: '#10B981',
                    isOwner: true,
                    status: 'sending'
                };

                io.to(sessionUserId).emit('chat_message', chatMessage);

                const result = await this.messageSenderService.sendMessage({
                    userId: sessionUserId,
                    message,
                    platforms: filteredPlatforms
                });

                const successfulPlatforms = result.results.filter(r => r.success);
                const failedPlatforms = result.results.filter(r => !r.success);

                let finalStatus: string;
                let errorMessage: string | undefined;

                if (successfulPlatforms.length === result.results.length) {
                    finalStatus = 'sent';
                } else if (successfulPlatforms.length > 0) {
                    finalStatus = 'error';
                    errorMessage = `Falló en: ${failedPlatforms.map(r => r.platform).join(', ')}`;
                } else {
                    finalStatus = 'error';
                    errorMessage = 'No se pudo enviar a ninguna plataforma';
                }

                const platformIds: Record<string, string> = {};
                successfulPlatforms.forEach(r => {
                    if (r.messageId) platformIds[r.platform] = r.messageId;
                });

                io.to(sessionUserId).emit('message_status_update', {
                    messageId,
                    status: finalStatus,
                    errorMessage,
                    platformIds
                });

                socket.emit('message_sent_result', result);

                logger.info(
                    { userId: sessionUserId, success: result.success, platformCount: result.results.length },
                    'Message send completed'
                );

            } catch (error) {
                SocketErrorHandler.emitInternalError(socket, error, 'send_message handler');
            }
        });
    }
}
