/** Orquestador de chat post-autenticación con manejo de errores y separación de intereses */

import { Platform } from '../../constants/platforms';
import { ChatManager } from '../ChatManager';
import { logger } from '../../utils/logger';
import { withErrorHandling } from '../../utils/errorHandling';

export interface ChatConnectionContext {
    userId: string;
    platform: Platform;
    shouldConnect: boolean;
    reason?: string;
}

export class AuthChatOrchestrator {
    constructor(private chatManager: ChatManager) { }

    async connectIfNeeded(context: ChatConnectionContext): Promise<void> {
        const { userId, platform, shouldConnect, reason } = context;

        if (!shouldConnect) {
            logger.debug(
                { userId, platform, reason },
                'AuthChatOrchestrator: Skipping chat connection'
            );
            return;
        }

        await withErrorHandling(
            async () => {
                logger.info(
                    { userId, platform, reason },
                    'AuthChatOrchestrator: Starting chat connection'
                );

                await this.chatManager.connectProvider(userId, platform);

                logger.info(
                    { userId, platform },
                    'AuthChatOrchestrator: Chat connected successfully'
                );
            },
            { userId, platform, action: 'connectChatAfterAuth' },
            { rethrow: false }
        );
    }

    async disconnect(userId: string, platform: Platform): Promise<void> {
        await withErrorHandling(
            async () => {
                logger.info(
                    { userId, platform },
                    'AuthChatOrchestrator: Starting chat disconnection'
                );

                await this.chatManager.disconnectProvider(userId, platform);

                logger.info(
                    { userId, platform },
                    'AuthChatOrchestrator: Chat disconnected successfully'
                );
            },
            { userId, platform, action: 'disconnectChat' },
            { rethrow: false }
        );
    }

    async reconnect(userId: string, platform: Platform): Promise<void> {
        logger.info(
            { userId, platform },
            'AuthChatOrchestrator: Reconnecting chat (disconnect + connect)'
        );

        await this.disconnect(userId, platform);
        await this.connectIfNeeded({
            userId,
            platform,
            shouldConnect: true,
            reason: 'reconnection'
        });
    }

    async disconnectAll(userId: string): Promise<void> {
        await withErrorHandling(
            async () => {
                logger.info({ userId }, 'AuthChatOrchestrator: Disconnecting all chats');
                await this.chatManager.disconnectUser(userId);
            },
            { userId, action: 'disconnectAll' },
            { rethrow: false }
        );
    }
}
