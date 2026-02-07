/** Escuchador de eventos de TikTok con transformación y emisión a clientes */

import { Server } from 'socket.io';
import { TikTokLiveConnection } from 'tiktok-live-connector';
import { TikTokEventTransformer } from '../transformers/TikTokEventTransformer';
import { TikTokChatEvent, TikTokGiftEvent, TikTokLikeEvent, TikTokFollowEvent } from '../../../types/tiktok.types';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';

export class TikTokEventListener {
    private streamConfirmed: Set<string> = new Set();

    constructor(private transformer: TikTokEventTransformer) { }

    setupListeners(userId: string, connection: TikTokLiveConnection, io: Server): void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const conn = connection as any;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        conn.on('chat', (data: TikTokChatEvent) => {
            // Confirmar que el stream está activo al recibir el primer mensaje
            if (!this.streamConfirmed.has(userId)) {
                logger.info({ userId }, 'TikTok stream confirmed active (first chat message received)');
                SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connected', undefined, true);
                this.streamConfirmed.add(userId);
            }

            const normalizedMessage = this.transformer.transformChatMessage(data);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'tiktok');
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        conn.on('gift', (data: TikTokGiftEvent) => {
            if (!data.repeatEnd) return;

            // Confirmar que el stream está activo al recibir el primer regalo
            if (!this.streamConfirmed.has(userId)) {
                logger.info({ userId }, 'TikTok stream confirmed active (first gift received)');
                SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connected', undefined, true);
                this.streamConfirmed.add(userId);
            }

            const normalizedMessage = this.transformer.transformGift(data);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'tiktok');
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-member-access
        conn.on('like', (_data: TikTokLikeEvent) => {
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        conn.on('follow', (data: TikTokFollowEvent) => {
            // Confirmar que el stream está activo al recibir el primer follow
            if (!this.streamConfirmed.has(userId)) {
                logger.info({ userId }, 'TikTok stream confirmed active (first follow received)');
                SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connected', undefined, true);
                this.streamConfirmed.add(userId);
            }

            const normalizedMessage = this.transformer.transformFollow(data);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'tiktok');
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        conn.on('roomUser', (info: { viewerCount: number }) => {
            // Confirmar que el stream está activo al recibir información de viewers
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
