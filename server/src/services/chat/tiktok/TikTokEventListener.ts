/**
 * Escuchador de Eventos de TikTok
 * Responsabilidad: Configurar listeners de eventos de TikTok
 */

import { Server } from 'socket.io';
import { WebcastPushConnection } from 'tiktok-live-connector';
import { TikTokEventTransformer } from '../transformers/TikTokEventTransformer';
import { TikTokChatEvent, TikTokGiftEvent, TikTokLikeEvent, TikTokFollowEvent } from '../../../types/tiktok.types';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';

export class TikTokEventListener {
    constructor(private transformer: TikTokEventTransformer) { }

    setupListeners(userId: string, connection: WebcastPushConnection, io: Server): void {
        connection.on('chat', (data: TikTokChatEvent) => {
            const normalizedMessage = this.transformer.transformChatMessage(data);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'tiktok');
        });

        connection.on('gift', (data: TikTokGiftEvent) => {
            if (!data.repeatEnd) return;
            const normalizedMessage = this.transformer.transformGift(data);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'tiktok');
        });

        connection.on('like', (_data: TikTokLikeEvent) => {
            // Ignorado por ahora
        });

        connection.on('follow', (data: TikTokFollowEvent) => {
            const normalizedMessage = this.transformer.transformFollow(data);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'tiktok');
        });

        connection.on('roomUser', (info: { viewerCount: number }) => {
            SafeSocketEmitter.emitViewersUpdate(io, userId, 'tiktok', info.viewerCount);
        });
    }
}
