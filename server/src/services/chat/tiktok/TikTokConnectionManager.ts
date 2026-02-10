/**
 * Manejador directo de la librería tiktok-live-connector
 */

import { TikTokLiveConnection } from 'tiktok-live-connector';
import { logger } from '../../../utils/logger';

export class TikTokConnectionManager {
    private static readonly CONNECTION_TIMEOUT_MS = 30000;

    async connect(username: string): Promise<TikTokLiveConnection> {
        const tiktokChat = new TikTokLiveConnection(username);

        try {
            await Promise.race([
                tiktokChat.connect(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Connection timeout')), TikTokConnectionManager.CONNECTION_TIMEOUT_MS)
                )
            ]);
        } catch (error) {
            // Si hay timeout o error inicial, asegurarnos de limpiar el objeto
            try {
                tiktokChat.disconnect();
            } catch { /* ignore */ }
            throw error;
        }

        try {
            // Definimos la estructura esperada de la información interna de la sala
            interface TikTokRoomInfo {
                status?: number;
                data?: {
                    status?: number;
                };
            }

            // Accedemos de forma segura a las propiedades internas
            const client = tiktokChat as unknown as {
                getRoomInfo?: () => TikTokRoomInfo;
                roomInfo?: TikTokRoomInfo;
            };

            const roomInfo = client.getRoomInfo?.() ?? client.roomInfo;

            logger.debug({ username, roomInfo }, 'TikTok: Room Info Debug');

            // En TikTok v2, la estructura suele ser { data: { status: 2, ... } }
            // status 2 es LIVE. status 4 es OFFLINE.
            // Algunos entornos o versiones de la librería podrían aplanar la respuesta.
            const status = roomInfo?.data?.status ?? roomInfo?.status;

            if (!roomInfo || status !== 2) {
                logger.info({ username, status, hasRoomInfo: !!roomInfo }, 'TikTok: User is not live or room info invalid');
                await this.disconnect(tiktokChat);
                throw new Error('LIVE_ACCESS_ROOM_ERROR: User is not live');
            }
        } catch (error) {
            // Re-lanzar para que TikTokChatProvider y ErrorHandler lo vean
            throw error;
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
