import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { ChatManager } from '../services/core/ChatManager';
import { MessageSenderService } from '../services/message/MessageSenderService';
import { TwitchModerationService } from '../services/moderation/TwitchModerationService';
import { KickModerationService } from '../services/moderation/KickModerationService';
import { YouTubeModerationService } from '../services/moderation/YouTubeModerationService';
import { ConnectionService } from '../services/connection/ConnectionService';
import { YouTubeService } from '../services/platforms/YouTubeService';

import { SocketConnectionManager } from './services/SocketConnectionManager';
import { createAuthMiddleware } from './middleware/SocketAuthMiddleware';
import { MessageSocketHandler } from './handlers/MessageSocketHandler';
import { ModerationSocketHandler } from './handlers/ModerationSocketHandler';
import { ConnectionSocketHandler } from './handlers/ConnectionSocketHandler';

declare module 'socket.io' {
    interface SocketData {
        userId?: string;
    }
}

export const setupSocketHandlers = (
    io: Server,
    chatManager: ChatManager,
    messageSenderService: MessageSenderService,
    connectionService: ConnectionService,
    youtubeService: YouTubeService
) => {
    logger.info({}, 'Configurando manejadores de Socket.io');

    // Initialize dependencies
    const connectionManager = new SocketConnectionManager(chatManager);
    const twitchModerationService = new TwitchModerationService();
    const kickModerationService = new KickModerationService();
    const youtubeModerationService = new YouTubeModerationService();

    // Initialize handlers
    const messageHandler = new MessageSocketHandler(messageSenderService);
    const moderationHandler = new ModerationSocketHandler(
        twitchModerationService,
        kickModerationService,
        youtubeModerationService,
        connectionService,
        youtubeService
    );
    const connectionHandler = new ConnectionSocketHandler(connectionManager);

    // Setup authentication middleware
    io.use(createAuthMiddleware());

    io.on('connection', async (socket: Socket) => {
        const authenticatedUserId = (socket.data as { userId?: string }).userId;

        if (!authenticatedUserId) {
            socket.disconnect();
            return;
        }

        logger.info({ socketId: socket.id, userId: authenticatedUserId }, 'Cliente autenticado conectado a Socket.io');

        // Setup all handlers
        messageHandler.setupHandler(socket, io, authenticatedUserId);
        moderationHandler.setupHandler(socket, authenticatedUserId);
        await connectionHandler.setupHandler(socket, io, authenticatedUserId);
    });

    logger.info({}, 'Manejadores de Socket.io configurados');
};