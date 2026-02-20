import { TikTokLiveConnection } from 'tiktok-live-connector';
import { logger } from '../../../utils/logger';

interface ExtendedTikTokConnection extends TikTokLiveConnection {
    getRoomInfo?: () => TikTokRoomInfo;
    roomInfo: TikTokRoomInfo;
}

interface TikTokRoomInfo {
    status?: number;
    data?: {
        status?: number;
    };
}

export class TikTokConnectionManager {
    private static readonly CONNECTION_TIMEOUT_MS = 30000;

    async connect(username: string): Promise<TikTokLiveConnection> {
        const tiktokChat = new TikTokLiveConnection(username);
        let timeoutId: NodeJS.Timeout | undefined;

        try {
            await Promise.race([
                tiktokChat.connect(),
                new Promise((_, reject) =>
                    timeoutId = setTimeout(() => reject(new Error('Connection timeout')), TikTokConnectionManager.CONNECTION_TIMEOUT_MS)
                )
            ]);
        } catch (error) {
            this.disconnect(tiktokChat, true);
            throw error;
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }

        const client = tiktokChat as ExtendedTikTokConnection;
        const roomInfo = client.getRoomInfo?.() ?? client.roomInfo;

        logger.debug({ username, roomInfo }, 'TikTok: Room Info Debug');

        const status = roomInfo?.data?.status ?? roomInfo?.status;

        if (!roomInfo || status !== 2) {
            logger.info({ username, status, hasRoomInfo: !!roomInfo }, 'TikTok: User is not live or room info invalid');
            this.disconnect(tiktokChat);
            throw new Error('LIVE_ACCESS_ROOM_ERROR: User is not live');
        }

        logger.info({ username }, 'Connected to TikTok');
        return tiktokChat;
    }

    disconnect(connection: TikTokLiveConnection, silent = false): void {
        try {
            connection.disconnect();
        } catch (error) {
            if (silent) {
                logger.debug({ err: error }, 'Silent disconnect failed (expected during cleanup)');
            } else {
                logger.error({ err: error }, 'Error disconnecting TikTok');
            }
        }
    }
}