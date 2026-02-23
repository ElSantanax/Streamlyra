/** Wrapper seguro para emisiones de Socket.IO con manejo de errores */

import { Server } from 'socket.io';
import { logger } from './logger';
import { config } from '../config';
import { StreamSessionManager } from '../services/core/StreamSessionManager';
import { sentMessageCache } from './SentMessageCache';

interface EmitOptions {
    userId: string;
    event: string;
    data: unknown;
    platform?: string;
}

export class SafeSocketEmitter {
    static emit(io: Server, options: EmitOptions): boolean {
        const { userId, event, data, platform } = options;

        try {
            if (!userId || typeof userId !== 'string') {
                logger.warn(
                    { userId, event, platform },
                    'SafeSocketEmitter: userId inválido'
                );
                return false;
            }

            if (!event || typeof event !== 'string') {
                logger.warn(
                    { userId, event, platform },
                    'SafeSocketEmitter: event inválido'
                );
                return false;
            }

            if (data === undefined) {
                logger.warn(
                    { userId, event, platform },
                    'SafeSocketEmitter: data es undefined'
                );
                return false;
            }

            if (io.sockets?.adapter?.rooms) {
                const sockets = io.sockets.adapter.rooms.get(userId);

                logger.debug(
                    {
                        userId,
                        event,
                        platform,
                        hasRoom: !!sockets,
                        socketCount: sockets?.size || 0
                    },
                    'SafeSocketEmitter: Verificando room del usuario'
                );

                if (!sockets || sockets.size === 0) {
                    logger.debug(
                        { userId, event, platform },
                        'SafeSocketEmitter: Usuario sin sockets activos, omitiendo emisión'
                    );
                    return false;
                }
            }

            if (config.nodeEnv === 'development' || process.env.NODE_ENV === 'development') {
                try {
                    JSON.stringify(data);
                } catch (serializationError) {
                    logger.error(
                        { err: serializationError, userId, event, platform },
                        'SafeSocketEmitter: Error de serialización (posible referencia circular)'
                    );
                    return false;
                }
            }

            io.to(userId).emit(event, data);

            logger.debug(
                { userId, event, platform },
                'SafeSocketEmitter: Evento emitido exitosamente'
            );

            return true;

        } catch (error) {
            logger.error(
                { err: error, userId, event, platform },
                'SafeSocketEmitter: Error inesperado al emitir evento'
            );
            return false;
        }
    }

    static emitChatMessage(io: Server, userId: string, message: unknown, platform?: string): boolean {
        interface ChatMessage {
            isOwner?: boolean;
            message?: string;
        }

        const msg = message as ChatMessage;

        logger.debug(
            {
                userId,
                platform,
                isOwner: msg?.isOwner,
                messagePreview: typeof msg?.message === 'string' ? msg.message.substring(0, 50) : undefined
            },
            'SafeSocketEmitter: emitChatMessage - Emisión inmediata activada'
        );

        if (msg && typeof msg === 'object' && msg.isOwner && typeof msg.message === 'string') {
            if (sentMessageCache.wasSentFromDashboard(userId, msg.message)) {
                logger.debug({ userId, platform, message: msg.message }, 'SafeSocketEmitter: Echo prevented');
                return false;
            }
        }

        // EMISIÓN DIRECTA: Sin batching, sin esperas.
        io.to(userId).emit('chat_message', message);

        return true;
    }

    static emitViewersUpdate(
        io: Server,
        userId: string,
        platform: string,
        count: number,
        isLive?: boolean
    ): boolean {
        const sessionManager = StreamSessionManager.getInstance();

        // Si no se pasa isLive, mantenemos el estado actual de la plataforma en la sesión
        const currentlyLive = sessionManager.isPlatformLive(userId, platform);
        const finalIsLive = isLive !== undefined ? isLive : currentlyLive;
        const session = sessionManager.updateLiveStatus(userId, platform, finalIsLive);

        return this.emit(io, {
            userId,
            event: 'viewers_update',
            data: {
                platform,
                count,
                isLive: finalIsLive,
                sessionStartTime: session.startTime,
                serverTime: new Date().toISOString()
            },
            platform
        });
    }

    static emitConnectionStatus(
        io: Server,
        userId: string,
        platform: string,
        status: 'connecting' | 'waiting_stream' | 'connected' | 'disconnected' | 'error',
        message?: string,
        isLive?: boolean
    ): boolean {
        const sessionManager = StreamSessionManager.getInstance();

        let finalIsLive = isLive !== undefined ? isLive : (status === 'connected' && sessionManager.isPlatformLive(userId, platform));
        if (status === 'disconnected') finalIsLive = false;

        const session = sessionManager.updateLiveStatus(userId, platform, finalIsLive);

        return this.emit(io, {
            userId,
            event: 'connection_status',
            data: {
                platform,
                status,
                message,
                isLive: finalIsLive,
                sessionStartTime: session.startTime,
                serverTime: new Date().toISOString()
            },
            platform
        });
    }

    static emitError(
        io: Server,
        userId: string,
        code: string,
        message: string,
        platform?: string
    ): boolean {
        return this.emit(io, {
            userId,
            event: 'error',
            data: { code, message },
            platform
        });
    }

    static emitLastFollowerUpdate(
        io: Server,
        userId: string,
        followerData: { name: string; platform: string; at: Date } | null
    ): boolean {
        return this.emit(io, {
            userId,
            event: 'last_follower_update',
            data: followerData
        });
    }

    static emitLastRaidUpdate(
        io: Server,
        userId: string,
        raidData: { name: string; platform: string; viewers: number; at: Date } | null
    ): boolean {
        return this.emit(io, {
            userId,
            event: 'last_raid_update',
            data: raidData
        });
    }
}
