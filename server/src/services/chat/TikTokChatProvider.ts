import { Server } from 'socket.io';
import { WebcastPushConnection } from 'tiktok-live-connector';
import { ChatProvider } from './ChatProvider';
import { Connection } from '../../models/Connection.model';
import colors from 'colors';
import { TikTokChatEvent, TikTokGiftEvent, TikTokLikeEvent, TikTokFollowEvent } from '../../types/tiktok.types';

export class TikTokChatProvider implements ChatProvider {
    private activeConnections: Map<string, WebcastPushConnection> = new Map();
    private processedMessages: Map<string, Set<string>> = new Map();
    private retryIntervals: Map<string, NodeJS.Timeout> = new Map();

    async connect(userId: string, io: Server): Promise<void> {
        const connection = await Connection.findOne({
            where: { userId, provider: 'tiktok' }
        });

        if (!connection || !connection.providerUsername) return;

        const tiktokUsername = connection.providerUsername;

        // Limpiar cualquier intento previo
        this.stopRetrying(userId);

        if (this.activeConnections.has(userId)) {
            await this.disconnect(userId);
        }

        if (!this.processedMessages.has(userId)) {
            this.processedMessages.set(userId, new Set());
        }

        const startConnection = async () => {
            // Guard: No reconectar si el usuario ya borró la plataforma o desconectó
            const stillExists = await Connection.findOne({ where: { userId, provider: 'tiktok' } });
            if (!stillExists) {
                this.stopRetrying(userId);
                return;
            }

            console.log(colors.cyan(`[TikTokChat] Intentando conectar a @${tiktokUsername}...`));

            try {
                const tiktokChat = new WebcastPushConnection(tiktokUsername);

                await tiktokChat.connect();
                console.log(colors.green(`✅ [TikTokChat] Conectado a @${tiktokUsername}`));
                this.stopRetrying(userId);

                this.setupListeners(userId, tiktokChat, io, tiktokUsername);
                this.activeConnections.set(userId, tiktokChat);

            } catch {
                // Si falla (ej: no está en directo), reintentar en 60 seg
                if (!this.retryIntervals.has(userId)) {
                    console.log(colors.yellow(`[TikTokChat] No se pudo conectar a @${tiktokUsername} (¿Oculto o No Live?). Reintentando en 60s...`));
                    const interval = setInterval(() => void startConnection(), 60000);
                    this.retryIntervals.set(userId, interval);
                }
            }
        };

        void startConnection();
    }

    private stopRetrying(userId: string) {
        const interval = this.retryIntervals.get(userId);
        if (interval) {
            clearInterval(interval);
            this.retryIntervals.delete(userId);
        }
    }

    private setupListeners(userId: string, tiktokChat: WebcastPushConnection, io: Server, tiktokUsername: string) {
        tiktokChat.on('chat', (data: TikTokChatEvent) => {
            const msgId: string = data.msgId || `tk_${Date.now()}_${data.userId}`;
            const msgSet = this.processedMessages.get(userId)!;

            if (msgSet.has(msgId)) return;
            msgSet.add(msgId);

            if (msgSet.size > 500) {
                const first = msgSet.values().next().value as string | undefined;
                if (first) msgSet.delete(first);
            }

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
            console.log(colors.yellow(`[TikTokChat] Desconectado de @${tiktokUsername}. Comprobando si se debe reintentar...`));

            // Verificar si la conexión aún existe en la base de datos
            const stillConnected = await Connection.findOne({ where: { userId, provider: 'tiktok' } });

            if (stillConnected) {
                this.activeConnections.delete(userId);
                void this.connect(userId, io);
            } else {
                console.log(colors.gray(`[TikTokChat] Desconexión definitiva para ${userId} (Plataforma eliminada).`));
                this.activeConnections.delete(userId);
            }
        });

        tiktokChat.on('error', (err: Error) => {
            console.error(colors.red(`[TikTokChat] Error en conexión @${tiktokUsername}:`), err.message);
            tiktokChat.disconnect();
        });
    }

    async disconnect(userId: string): Promise<void> {
        this.stopRetrying(userId);
        const connection = this.activeConnections.get(userId);
        if (connection) {
            connection.disconnect();
            this.activeConnections.delete(userId);
        }
    }
}
