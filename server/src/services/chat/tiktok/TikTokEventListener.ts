import { Server } from 'socket.io';
import { TikTokLiveConnection } from 'tiktok-live-connector';
import { TikTokEventTransformer } from '../transformers/TikTokEventTransformer';
import { TikTokChatEvent, TikTokGiftEvent, TikTokFollowEvent, TikTokConnection } from '../../../types/tiktok.types';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';
import { AnalyticsService } from '../../core/AnalyticsService';

export class TikTokEventListener {
    private streamConfirmed: Set<string> = new Set();

    constructor(private transformer: TikTokEventTransformer) { }

    setupListeners(userId: string, connection: TikTokLiveConnection, io: Server): void {
        const conn = connection as unknown as TikTokConnection;

        conn.on('chat', (data: TikTokChatEvent) => {
            if (!this.streamConfirmed.has(userId)) {
                logger.info({ userId }, 'TikTok stream confirmed active (first chat message received)');
                SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connected', undefined, true);
                this.streamConfirmed.add(userId);
            }

            const normalizedMessage = this.transformer.transformChatMessage(data);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'tiktok');
        });

        conn.on('gift', (data: TikTokGiftEvent) => {
            if (!data.repeatEnd) return;

            if (!this.streamConfirmed.has(userId)) {
                logger.info({ userId }, 'TikTok stream confirmed active (first gift received)');
                SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connected', undefined, true);
                this.streamConfirmed.add(userId);
            }

            const normalizedMessage = this.transformer.transformGift(data);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'tiktok');
        });

        conn.on('follow', (data: TikTokFollowEvent) => {
            if (!this.streamConfirmed.has(userId)) {
                logger.info({ userId }, 'TikTok stream confirmed active (first follow received)');
                SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connected', undefined, true);
                this.streamConfirmed.add(userId);
            }

            const normalizedMessage = this.transformer.transformFollow(data);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'tiktok');

            AnalyticsService.updateLastFollower(userId, 'tiktok', normalizedMessage.user)
                .then(updated => {
                    if (updated) {
                        SafeSocketEmitter.emitLastFollowerUpdate(io, userId, {
                            name: updated.lastFollowerName,
                            platform: updated.lastFollowerPlatform,
                            at: updated.lastFollowerAt
                        });
                    }
                })
                .catch(err => logger.error({ err, userId }, 'Error procesando analytics de seguidor en TikTok'));
        });

        conn.on('roomUser', (info: { viewerCount: number }) => {
            if (!this.streamConfirmed.has(userId)) {
                logger.info({ userId }, 'TikTok stream confirmed active (viewer count received)');
                SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connected', undefined, true);
                this.streamConfirmed.add(userId);
            }

            SafeSocketEmitter.emitViewersUpdate(io, userId, 'tiktok', info.viewerCount, true);
        });
    }

    clearStreamConfirmation(userId: string): void {
        this.streamConfirmed.delete(userId);
    }

    isStreamConfirmed(userId: string): boolean {
        return this.streamConfirmed.has(userId);
    }
}