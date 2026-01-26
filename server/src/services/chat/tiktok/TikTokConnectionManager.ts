/**
 * Gestor de Conexión de TikTok
 * Responsabilidad: Gestionar conexión WebSocket a TikTok
 */

import { WebcastPushConnection } from 'tiktok-live-connector';
import { logger } from '../../../utils/logger';

export class TikTokConnectionManager {
    private static readonly CONNECTION_TIMEOUT_MS = 15000;

    async connect(username: string): Promise<WebcastPushConnection> {
        const tiktokChat = new WebcastPushConnection(username);

        await Promise.race([
            tiktokChat.connect(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection timeout')), TikTokConnectionManager.CONNECTION_TIMEOUT_MS)
            )
        ]);

        logger.info({ username }, 'Connected to TikTok');
        return tiktokChat;
    }

    async disconnect(connection: WebcastPushConnection): Promise<void> {
        try {
            connection.disconnect();
        } catch (error) {
            logger.error({ err: error }, 'Error disconnecting TikTok');
        }
    }
}
