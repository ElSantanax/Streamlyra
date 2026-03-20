import { Server } from 'socket.io';
import { TikTokLiveConnection } from 'tiktok-live-connector';
import { TikTokEventTransformer } from '../transformers/TikTokEventTransformer';
import { TikTokChatEvent, TikTokGiftEvent, TikTokFollowEvent, TikTokConnection, TikTokEnvelopeEvent, TikTokMemberEvent } from '../../../types/tiktok.types';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';
import { AnalyticsService } from '../../core/AnalyticsService';

export class TikTokEventListener {
    private streamConfirmed: Set<string> = new Set();

    constructor(private transformer: TikTokEventTransformer) { }

    setupListeners(userId: string, connection: TikTokLiveConnection, io: Server): void {
        const conn = connection as unknown as TikTokConnection;

        conn.on('chat', (data: TikTokChatEvent) => {
            this.confirmStreamActive(userId, 'first chat message', io);
            const normalizedMessage = this.transformer.transformChatMessage(data);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'tiktok');
        });

        conn.on('gift', (data: TikTokGiftEvent) => {
            if (!data.repeatEnd) return;
            this.confirmStreamActive(userId, 'first gift', io);
            const normalizedMessage = this.transformer.transformGift(data);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'tiktok');
        });

        conn.on('follow', (data: TikTokFollowEvent) => {
            this.confirmStreamActive(userId, 'first follow', io);
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
            this.confirmStreamActive(userId, 'viewer count', io);
            SafeSocketEmitter.emitViewersUpdate(io, userId, 'tiktok', info.viewerCount, true);
        });

        conn.on('envelope', (data: TikTokEnvelopeEvent) => {
            this.confirmStreamActive(userId, 'first envelope', io);
            const normalizedMessage = this.transformer.transformEnvelope(data);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'tiktok');
        });

        conn.on('member', (data: TikTokMemberEvent) => {
            if (data.action !== 3) return; // Only process subscription (action 3)
            this.confirmStreamActive(userId, 'first subscription', io);
            const normalizedMessage = this.transformer.transformSubscribe(data);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'tiktok');
        });
    }

    private confirmStreamActive(userId: string, source: string, io: Server): void {
        if (!this.streamConfirmed.has(userId)) {
            logger.info({ userId }, `TikTok stream confirmed active (${source} received)`);
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connected', undefined, true);
            this.streamConfirmed.add(userId);
        }
    }

    clearStreamConfirmation(userId: string): void {
        this.streamConfirmed.delete(userId);
    }

    isStreamConfirmed(userId: string): boolean {
        return this.streamConfirmed.has(userId);
    }
}