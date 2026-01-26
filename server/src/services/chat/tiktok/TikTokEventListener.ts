/**
 * Escuchador de Eventos de TikTok
 * Responsabilidad: Configurar listeners de eventos de TikTok
 */

import { Server } from 'socket.io';
import { WebcastPushConnection } from 'tiktok-live-connector';
import { TikTokEventTransformer } from '../transformers/TikTokEventTransformer';
import { TikTokChatEvent, TikTokGiftEvent, TikTokLikeEvent, TikTokFollowEvent } from '../../../types/tiktok.types';

export class TikTokEventListener {
    constructor(private transformer: TikTokEventTransformer) { }

    setupListeners(userId: string, connection: WebcastPushConnection, io: Server): void {
        connection.on('chat', (data: TikTokChatEvent) => {
            const normalizedMessage = this.transformer.transformChatMessage(data);
            io.to(userId).emit('chat_message', normalizedMessage);
        });

        connection.on('gift', (data: TikTokGiftEvent) => {
            if (!data.repeatEnd) return;
            const normalizedMessage = this.transformer.transformGift(data);
            io.to(userId).emit('chat_message', normalizedMessage);
        });

        connection.on('like', (_data: TikTokLikeEvent) => {
            // Ignorado por ahora
        });

        connection.on('follow', (data: TikTokFollowEvent) => {
            const normalizedMessage = this.transformer.transformFollow(data);
            io.to(userId).emit('chat_message', normalizedMessage);
        });

        connection.on('roomUser', (info: { viewerCount: number }) => {
            io.to(userId).emit('viewers_update', {
                platform: 'tiktok',
                count: info.viewerCount
            });
        });
    }
}
