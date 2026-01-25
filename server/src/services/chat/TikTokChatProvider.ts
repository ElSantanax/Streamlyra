import { Server } from 'socket.io';
import { WebcastPushConnection } from 'tiktok-live-connector';
import { ChatProvider } from './ChatProvider';
import { Connection } from '../../models/Connection.model';
import { MessageDeduplicator } from '../../utils/messageDeduplicate';
import { retryWithInterval } from '../../utils/retryWithInterval';
import { TikTokChatEvent, TikTokGiftEvent, TikTokLikeEvent, TikTokFollowEvent } from '../../types/tiktok.types';

export class TikTokChatProvider implements ChatProvider {
    private activeConnections: Map<string, WebcastPushConnection> = new Map();
    private deduplicators: Map<string, MessageDeduplicator> = new Map();
    private retryCleanup: Map<string, () => void> = new Map();

    async connect(userId: string, io: Server): Promise<void> {
        const connection = await Connection.findOne({
            where: { userId: String(userId), provider: 'tiktok' }
        });

        if (!connection?.providerUsername) return;

        const tiktokUsername = connection.providerUsername.replace(/^@+/, '');

        this.retryCleanup.get(userId)?.();

        if (this.activeConnections.has(userId)) {
            await this.disconnect(userId);
        }

        if (!this.deduplicators.has(userId)) {
            this.deduplicators.set(userId, new MessageDeduplicator());
        }

        const startConnection = async () => {
            const stillExists = await Connection.findOne({ where: { userId: String(userId), provider: 'tiktok' } });
            if (!stillExists) return this.retryCleanup.get(userId)?.();

            io.to(userId).emit('connection_status', { platform: 'tiktok', status: 'connecting' });
            console.log(`[TikTokChat] Intentando conectar a ${tiktokUsername}...`);

            try {
                const tiktokChat = new WebcastPushConnection(tiktokUsername);

                await Promise.race([
                    tiktokChat.connect(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexión (15s)')), 15000))
                ]);

                console.log(`[TikTokChat] ✅ Conectado a ${tiktokUsername}`);
                this.retryCleanup.get(userId)?.();

                io.to(userId).emit('connection_status', { platform: 'tiktok', status: 'connected' });

                this.setupListeners(userId, tiktokChat, io, tiktokUsername);
                this.activeConnections.set(userId, tiktokChat);

            } catch (error) {
                if (this.retryCleanup.has(userId)) return;

                console.error(`[TikTokChat] Error en ${tiktokUsername}:`, error);
                io.to(userId).emit('connection_status', { platform: 'tiktok', status: 'error', message: 'Cuenta oculta o no en vivo. Reintentando...' });

                const cleanup = retryWithInterval(startConnection, { intervalMs: 60000 });
                this.retryCleanup.set(userId, cleanup);
            }
        };

        void startConnection();
    }

    private setupListeners(userId: string, tiktokChat: WebcastPushConnection, io: Server, tiktokUsername: string) {
        const dedup = this.deduplicators.get(userId)!;

        tiktokChat.on('chat', (data: TikTokChatEvent) => {
            const msgId: string = data.msgId || `tk_${Date.now()}_${data.userId}`;

            if (dedup.isDuplicate(msgId)) return;

            const chatMessage = {
                id: msgId,
                platform: 'tiktok',
                user: data.uniqueId,
                message: data.comment,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                avatar: data.profilePictureUrl,
                isMod: data.mod,
                isSub: data.subscriber,
                isOwner: data.isOwner
            };
            io.to(userId).emit('chat_message', chatMessage);
        });

        tiktokChat.on('gift', (data: TikTokGiftEvent) => {
            if (data.repeatEnd) {
                const giftId = `${data.userId}_${data.giftId}_${data.timestamp || Date.now()}`;
                const chatMessage = {
                    id: giftId,
                    platform: 'tiktok',
                    user: data.uniqueId,
                    message: '',
                    specialMessage: `🎁 REGALO: ${data.repeatCount}x ${data.giftName}`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    avatar: data.profilePictureUrl,
                    isSpecial: true
                };
                io.to(userId).emit('chat_message', chatMessage);
            }
        });

        tiktokChat.on('like', (_data: TikTokLikeEvent) => {
            // Ignorado por ahora
        });

        tiktokChat.on('follow', (data: TikTokFollowEvent) => {
            const followId = `follow_${data.userId}_${Date.now()}`;
            const chatMessage = {
                id: followId,
                platform: 'tiktok',
                user: data.uniqueId,
                message: `¡Te ha seguido!`,
                specialMessage: `👤 NUEVO SEGUIDOR`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                avatar: data.profilePictureUrl,
            };
            io.to(userId).emit('chat_message', chatMessage);
        });

        tiktokChat.on('roomUser', (info: { viewerCount: number }) => {
            io.to(userId).emit('viewers_update', {
                platform: 'tiktok',
                count: info.viewerCount
            });
        });

        tiktokChat.on('disconnected', async () => {
            console.log(`[TikTokChat] Desconectado de ${tiktokUsername}. Comprobando si se debe reintentar...`);

            // Verificar si la conexión aún existe en la base de datos
            const stillConnected = await Connection.findOne({ where: { userId: String(userId), provider: 'tiktok' } });

            if (stillConnected) {
                this.activeConnections.delete(userId);
                void this.connect(userId, io);
            } else {
                console.log(`[TikTokChat] Desconexión definitiva para ${userId} (Plataforma eliminada).`);
                this.activeConnections.delete(userId);
            }
        });

        tiktokChat.on('error', (err: Error) => {
            console.error(`[TikTokChat] Error en conexión ${tiktokUsername}:`, err.message);
            tiktokChat.disconnect();
        });
    }

    async disconnect(userId: string): Promise<void> {
        const cleanup = this.retryCleanup.get(userId);
        if (cleanup) {
            cleanup();
            this.retryCleanup.delete(userId);
        }

        const connection = this.activeConnections.get(userId);
        if (connection) {
            connection.disconnect();
            this.activeConnections.delete(userId);
        }

        this.deduplicators.delete(userId);
    }
}
