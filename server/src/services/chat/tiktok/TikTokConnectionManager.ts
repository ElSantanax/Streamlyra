/** Gestor de conexión WebSocket de TikTok con timeout de conexión */

import { TikTokLiveConnection } from 'tiktok-live-connector';
import { logger } from '../../../utils/logger';

export class TikTokConnectionManager {
    private static readonly CONNECTION_TIMEOUT_MS = 15000;

    async connect(username: string): Promise<TikTokLiveConnection> {
        const tiktokChat = new TikTokLiveConnection(username);

        await Promise.race([
            tiktokChat.connect(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection timeout')), TikTokConnectionManager.CONNECTION_TIMEOUT_MS)
            )
        ]);

        try {
            // Definimos la estructura esperada de la información interna de la sala
            interface TikTokRoomInfo {
                status?: number;
            }

            // Accedemos de forma segura a las propiedades internas extendiendo el tipo localmente
            const client = tiktokChat as unknown as {
                getRoomInfo?: () => TikTokRoomInfo;
                roomInfo?: TikTokRoomInfo;
            };

            const roomInfo = client.getRoomInfo?.() ?? client.roomInfo;

            if (roomInfo?.status === 4) {
                await this.disconnect(tiktokChat);
                throw new Error('LIVE_ACCESS_ROOM_ERROR: User is not live');
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('LIVE_ACCESS_ROOM_ERROR')) {
                throw error;
            }
        }

        logger.info({ username }, 'Connected to TikTok');
        return tiktokChat;
    }

    async disconnect(connection: TikTokLiveConnection): Promise<void> {
        try {
            connection.disconnect();
        } catch (error) {
            logger.error({ err: error }, 'Error disconnecting TikTok');
        }
    }
}
