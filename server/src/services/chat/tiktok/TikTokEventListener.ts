/** Escuchador de eventos de TikTok con transformación y emisión a clientes */

import { Server } from 'socket.io';
import { TikTokLiveConnection } from 'tiktok-live-connector';
import { TikTokEventTransformer } from '../transformers/TikTokEventTransformer';
import { TikTokChatEvent, TikTokGiftEvent, TikTokLikeEvent, TikTokFollowEvent } from '../../../types/tiktok.types';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';

export class TikTokEventListener {
    constructor(private transformer: TikTokEventTransformer) { }

    setupListeners(userId: string, connection: TikTokLiveConnection, io: Server): void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const conn = connection as any;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        conn.on('chat', (data: TikTokChatEvent) => {
            const normalizedMessage = this.transformer.transformChatMessage(data);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'tiktok');
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        conn.on('gift', (data: TikTokGiftEvent) => {
            if (!data.repeatEnd) return;
            const normalizedMessage = this.transformer.transformGift(data);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'tiktok');
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-member-access
        conn.on('like', (_data: TikTokLikeEvent) => {
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        conn.on('follow', (data: TikTokFollowEvent) => {
            const normalizedMessage = this.transformer.transformFollow(data);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'tiktok');
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        conn.on('roomUser', (info: { viewerCount: number }) => {
            SafeSocketEmitter.emitViewersUpdate(io, userId, 'tiktok', info.viewerCount);
        });
    }
}
